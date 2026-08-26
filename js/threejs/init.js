/* ZULF — live studio scenes.
   The hero turns a real model on a warm turntable; the
   work cards each run a small procedural "study" so the craft is
   visible everywhere. Loads FBX, GLB/GLTF and OBJ. Degrades to
   static plates when WebGL is out. */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

/* pick a loader from the file extension — fbx / glb / gltf / obj */
function loaderFor(url, manager) {
  const ext = String(url || "").split("?")[0].split("#")[0].split(".").pop().toLowerCase();
  if (ext === "glb" || ext === "gltf") return new GLTFLoader(manager);
  if (ext === "obj") return new OBJLoader(manager);
  return new FBXLoader(manager);
}

function isBlobUrl(url) {
  return typeof url === "string" && url.slice(0, 5) === "blob:";
}

/* last path segment, decoded — used to match texture references by filename */
function baseName(url) {
  return decodeURIComponent(
    String(url).split(/[\\/]/).pop().split("?")[0]
  ).toLowerCase();
}

/* a manager that redirects texture requests to uploaded texture files */
function textureManager(textures) {
  const map = new Map();
  (textures || []).forEach((t) => {
    if (!t) return;
    const name = typeof t === "string" ? baseName(t) : String(t.name || "").toLowerCase();
    const url = typeof t === "string" ? t : t.url;
    if (name && url) map.set(name, url);
  });
  const manager = new THREE.LoadingManager();
  if (map.size) {
    manager.setURLModifier((url) => {
      if (/^(blob:|data:)/i.test(url)) return url;
      return map.get(baseName(url)) || url;
    });
  }
  return manager;
}

const hasMaps = (m) =>
  !!m &&
  !!(m.map || m.normalMap || m.roughnessMap || m.metalnessMap || m.aoMap || m.emissiveMap);

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scenes = [];

/* ---------- shared scene pieces ---------- */

function makeRenderer(container, maxDpr) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function addLights(scene) {
  // white / natural — no orange cast, true albedo
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3.2, 5, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.85);
  scene.add(hemi);

  const rim = new THREE.DirectionalLight(0xffffff, 0.65);
  rim.position.set(-4.5, 2.2, -3.4);
  scene.add(rim);
}


function makeStage(radius, color) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.001;
  disc.receiveShadow = true;
  return disc;
}

const CLAY = () =>
  new THREE.MeshStandardMaterial({ color: 0xf1e9d9, roughness: 0.88, metalness: 0.02 });

function observeVisibility(entry) {
  entry.visible = true;
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        entry.visible = e.isIntersecting;
      });
    },
    { threshold: 0.05 }
  );
  io.observe(entry.container);
}

function onResize() {
  scenes.forEach((s) => {
    const w = s.container.clientWidth;
    const h = s.container.clientHeight;
    if (!w || !h) return;
    s.camera.aspect = w / h;
    s.camera.updateProjectionMatrix();
    s.renderer.setSize(w, h);
  });
}

/* ---------- shared viewer (any model, any page) ---------- */

function createViewer(container, opts = {}) {
  if (!container) return null;

  let renderer;
  try {
    renderer = makeRenderer(container, 2);
  } catch (err) {
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    40,
    container.clientWidth / container.clientHeight,
    0.1,
    60
  );
  camera.position.set(3.1, 2.15, 4.3);
  camera.lookAt(0, 0.85, 0);

  addLights(scene);
  scene.add(makeStage(2.6, 0xe9e0cd));

  const group = new THREE.Group();
  scene.add(group);

  let hasModel = false;
  let ready = false;
  const setCaption = (text) => {
    if (opts.onCaption) opts.onCaption(text);
  };

  /* ---------- loader plumbing (model.html only) ---------- */
  const stageEl = container.closest(".model-stage");
  const loaderEl = stageEl ? stageEl.querySelector(".model-stage-loader") : null;
  const loaderBar = loaderEl ? loaderEl.querySelector(".model-loader-bar") : null;
  const loaderStatus = loaderEl ? loaderEl.querySelector("#model-loader-status") : null;

  let loaderDismissed = false;
  let pendingObject = null;
  let geometryReady = false;
  let managerRef = null;

  const setProgress = (pct, label) => {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (loaderBar) loaderBar.style.width = p + "%";
    if (loaderStatus && label) loaderStatus.textContent = label;
    if (typeof opts.onProgress === "function") {
      try { opts.onProgress(p); } catch (_) {}
    }
  };

  const reveal = () => {
    if (loaderDismissed) return;
    loaderDismissed = true;
    ready = true;
    hasModel = true;
    if (typeof opts.onReady === "function") {
      try { opts.onReady(); } catch (_) {}
    }
    if (loaderEl) {
      setProgress(100, "Ready — 100%");
      loaderEl.setAttribute("aria-busy", "false");
      // allow 100% to be seen briefly, then fade
      setTimeout(() => {
        loaderEl.classList.add("is-hidden");
        if (stageEl) stageEl.classList.add("is-ready");
        if (renderer && renderer.domElement) renderer.domElement.style.opacity = "1";
      }, 350);
      setTimeout(() => {
        if (loaderEl) loaderEl.style.display = "none";
      }, 900);
    } else {
      if (stageEl) stageEl.classList.add("is-ready");
      if (renderer && renderer.domElement) renderer.domElement.style.opacity = "1";
    }
  };

  const tryReveal = () => {
    if (geometryReady && pendingObject == null) {
      // geometry + manager idle
      if (managerRef && managerRef.isLoading) return;
      reveal();
    }
  };

  if (loaderEl) {
    loaderEl.classList.remove("is-hidden");
    loaderEl.removeAttribute("hidden");
    loaderEl.style.display = "";
    loaderEl.setAttribute("aria-busy", "true");
    if (stageEl) stageEl.classList.remove("is-ready");
    if (loaderBar) loaderBar.style.width = "0%";
    if (loaderStatus) loaderStatus.textContent = "Preparing model… 0%";
    if (renderer && renderer.domElement) {
      renderer.domElement.style.opacity = "0";
      renderer.domElement.style.transition = "opacity 0.45s ease";
    }
    // safety: if nothing loads in 20s, reveal fallback
    setTimeout(() => { if (!loaderDismissed) { addFallback(); reveal(); } }, 20000);
  } else {
    // hero / cards: canvas visible immediately
    if (renderer && renderer.domElement) renderer.domElement.style.opacity = "1";
    ready = true;
  }

  async function addFallback() {
    if (hasModel) return;
    const maquette = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 4), CLAY());
    maquette.position.y = 0.95;
    maquette.castShadow = true;
    group.add(maquette);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 0.09, 24),
      new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.45, metalness: 0.3 })
    );
    base.position.y = 0.32;
    base.castShadow = true;
    group.add(base);

    const study = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 1), CLAY());
    study.position.set(0.98, 0.42, 0.6);
    study.castShadow = true;
    group.add(study);

    setCaption(opts.fallbackLabel || "Form study");
    hasModel = true;
    if (loaderEl) {
      setProgress(100, "Ready — 100%");
      // tiny delay so progress hits 100% before fade
      setTimeout(reveal, 200);
    } else {
      ready = true;
    }
  }

  async function placeObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.05 / maxDim;

    object.scale.setScalar(scale);
    object.position.sub(center.multiplyScalar(scale));

    const box2 = new THREE.Box3().setFromObject(object);
    object.position.y += -box2.min.y + 0.05;

    /* keep materials that carry textures; clay only for bare meshes */
    const texUrls = (opts.textures || []).filter(Boolean);
    const firstTex = texUrls.length ? (texUrls[0].url || texUrls[0]) : null;

    // Use the same manager so manual texture is tracked in progress/idle check
    const texLoader = managerRef ? new THREE.TextureLoader(managerRef) : new THREE.TextureLoader();

    // Pre-load first texture if needed — awaits so black material is never shown
    let preloadedTex = null;
    if (firstTex) {
      // check if any mesh already has maps; if so we keep original
      let needsTex = false;
      object.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        if (!mats.some(hasMaps)) needsTex = true;
      });
      if (needsTex) {
        preloadedTex = await new Promise((resolve) => {
          texLoader.load(
            firstTex,
            (t) => { t.colorSpace = THREE.SRGBColorSpace; resolve(t); },
            undefined,
            () => resolve(null)
          );
        });
      }
    }

    object.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      if (mats.some(hasMaps)) {
        mats.forEach((m) => {
          if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        });
      } else if (preloadedTex) {
        child.material = new THREE.MeshStandardMaterial({
          map: preloadedTex,
          roughness: 0.85,
          metalness: 0.02,
        });
      } else if (firstTex && !preloadedTex) {
        // fallback: still assign but should have been preloaded; keep clay if failed
        child.material = CLAY();
      } else {
        child.material = CLAY();
      }
    });

    group.add(object);
    setCaption(opts.label || "Model");
    // don't set hasModel/ready yet — wait for manager idle + double rAF
    pendingObject = null;
    geometryReady = true;

    // if manager still loading (embedded textures), wait for its onLoad
    if (managerRef && managerRef.isLoading) {
      const prevOnLoad = managerRef.onLoad;
      managerRef.onLoad = () => {
        if (typeof prevOnLoad === "function") try { prevOnLoad(); } catch (_) {}
        // ensure one rendered frame with textures before reveal
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      };
      return;
    }
    // otherwise reveal on next frames so texture is uploaded to GPU
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }

  if (opts.url) {
    try {
      /* blob: URLs have no extension — pass the original file via opts.format */
      const manager = textureManager(opts.textures);
      managerRef = manager;

      // progress for texture + model dependencies (up to ~85%)
      manager.onProgress = (url, loaded, total) => {
        const pct = total ? Math.round((loaded / total) * 85) : 0;
        setProgress(pct, "Loading assets… " + pct + "%");
      };
      const prevManagerLoad = manager.onLoad;
      manager.onLoad = () => {
        if (typeof prevManagerLoad === "function") try { prevManagerLoad(); } catch (_) {}
        tryReveal();
      };
      manager.onError = () => {};

      const loader = loaderFor(isBlobUrl(opts.url) ? opts.format : opts.url, manager);
      pendingObject = true;
      setProgress(8, "Loading model… 8%");
      loader.load(
        opts.url,
        async (object) => {
          /* GLTFLoader returns { scene, ... } instead of a plain object */
          const root = object.scene || object;
          pendingObject = root;
          setProgress(88, "Applying materials… 88%");
          try {
            await placeObject(root);
          } catch (e) {
            console.warn("placeObject failed", e);
            await addFallback();
            reveal();
          }
        },
        (ev) => {
          // XHR progress for the main file (0–85% -> mapped to 8–80%)
          if (ev && ev.lengthComputable && ev.total) {
            const pct = Math.round((ev.loaded / ev.total) * 72) + 8;
            setProgress(Math.min(80, pct), "Loading model… " + Math.min(80, pct) + "%");
          } else if (ev && ev.loaded) {
            // unknown total: pulse a bit
            const pct = Math.min(80, 12 + Math.round(ev.loaded / 12000));
            setProgress(pct, "Loading model… " + pct + "%");
          }
        },
        async () => {
          pendingObject = null;
          await addFallback();
          if (loaderEl) setProgress(100, "Ready — 100%");
          reveal();
        }
      );
    } catch (err) {
      pendingObject = null;
      addFallback();
      reveal();
    }
  } else {
    pendingObject = null;
    geometryReady = true;
    addFallback();
  }

  /* drag to turn the table; otherwise it spins on its own */
  let dragging = false;
  let lastX = 0;
  let dragYaw = 0;
  let autoYaw = 0;

  container.style.touchAction = "pan-y";
  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    dragYaw += dx * 0.008;
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });

  const entry = {
    container,
    renderer,
    scene,
    camera,
    onFrame() {
      // keep model hidden / frozen until fully textured and loader dismissed
      if (!ready) return;
      if (!REDUCED) {
        if (!dragging) autoYaw += 0.01;
        group.rotation.y = autoYaw + dragYaw;
      }
      if (!hasModel) group.rotation.y = performance.now() * 0.00018;
    },
  };

  scenes.push(entry);
  observeVisibility(entry);
  return entry;
}

/* ---------- hero: Noble Isle turntable ---------- */

function initTurntable() {
  const container = document.getElementById("turntable-scene");
  const caption = document.getElementById("hero-caption");
  if (!container) return;
  if (caption) caption.textContent = "Loading…";
  createViewer(container, {
    url: "assets/models/dggg/nobita.obj",
    label: "Nobita",
    onCaption: (text) => {
      if (caption) caption.textContent = text;
    },
  });
}

/* ---------- work-card studies ---------- */

function buildStudy(container, index) {
  let renderer;
  try {
    renderer = makeRenderer(container, 1.5);
  } catch (err) {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    40
  );
  camera.position.set(1.7, 1.25, 2.5);
  camera.lookAt(0, 0.25, 0);

  addLights(scene);
  scene.add(makeStage(1.6, 0xe7ddc8));

  const group = new THREE.Group();
  scene.add(group);

  if (index === 0) {
    /* AR product — an orb and a ring on a shelf */
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0xe8ddc4, roughness: 0.32, metalness: 0.18 })
    );
    orb.position.y = 0.58;
    orb.castShadow = true;
    group.add(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.035, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x8f3a1a, roughness: 0.3, metalness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2.1;
    ring.position.y = 0.58;
    ring.castShadow = true;
    group.add(ring);
  } else if (index === 1) {
    /* low-poly world — a faceted landmass */
    const isle = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95, 2),
      new THREE.MeshStandardMaterial({ color: 0xb7ad93, roughness: 0.95, metalness: 0, flatShading: true })
    );
    isle.scale.set(1.35, 0.62, 1.35);
    isle.position.y = 0.4;
    isle.castShadow = true;
    group.add(isle);

    const tower = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.38, 4),
      new THREE.MeshStandardMaterial({ color: 0x9c6b3a, roughness: 0.9, flatShading: true })
    );
    tower.position.set(0.42, 0.66, 0.16);
    tower.castShadow = true;
    group.add(tower);
  } else {
    /* product render — a dark knot beside a clay ball */
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.34, 0.1, 128, 16),
      new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.28, metalness: 0.55 })
    );
    knot.position.y = 0.62;
    knot.castShadow = true;
    group.add(knot);

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), CLAY());
    ball.position.set(0.72, 0.32, 0.45);
    ball.castShadow = true;
    group.add(ball);
  }

  const entry = {
    container,
    renderer,
    scene,
    camera,
    onFrame() {
      if (!REDUCED) group.rotation.y += 0.01;
    },
  };

  scenes.push(entry);
  observeVisibility(entry);
}

function initStudies() {
  const canvases = document.querySelectorAll(".work-canvas");
  canvases.forEach((canvas, i) => buildStudy(canvas, i));
}

/* ---------- boot ---------- */

function loop() {
  scenes.forEach((s) => {
    if (s.visible === false) return;
    s.onFrame();
    s.renderer.render(s.scene, s.camera);
  });
  requestAnimationFrame(loop);
}

window.addEventListener("resize", onResize);
window.addEventListener("load", onResize);

window.initTurntable = initTurntable;
window.initStudies = initStudies;
window.zulfCreateViewer = createViewer;

loop();
