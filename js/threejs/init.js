/* ZULF — live studio scenes.
   The hero turns the real Noble_Isle.fbx on a warm turntable; the
   work cards each run a small procedural "study" so the craft is
   visible everywhere. Degrades to static plates when WebGL is out. */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

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
  const key = new THREE.DirectionalLight(0xffd9a8, 2.6);
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

  const hemi = new THREE.HemisphereLight(0xfff1de, 0x3d3123, 0.75);
  scene.add(hemi);

  const rim = new THREE.DirectionalLight(0xffe3bd, 0.7);
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
  const setCaption = (text) => {
    if (opts.onCaption) opts.onCaption(text);
  };

  function addFallback() {
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
  }

  function placeObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.05 / maxDim;

    object.scale.setScalar(scale);
    object.position.sub(center.multiplyScalar(scale));

    const box2 = new THREE.Box3().setFromObject(object);
    object.position.y += -box2.min.y + 0.05;

    object.traverse((child) => {
      if (child.isMesh) {
        child.material = CLAY();
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    group.add(object);
    setCaption(opts.label || "Model");
    hasModel = true;
  }

  if (opts.url) {
    try {
      const loader = new FBXLoader();
      loader.load(opts.url, placeObject, undefined, addFallback);
    } catch (err) {
      addFallback();
    }
  } else {
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
      if (!REDUCED) {
        if (!dragging) autoYaw += 0.0028;
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
    url: "assets/models/Noble_Isle.fbx",
    label: "Noble Isle",
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
      if (!REDUCED) group.rotation.y += 0.0042;
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
