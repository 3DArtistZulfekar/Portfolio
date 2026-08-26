/* model viewer page — full-view turntable for one model (model.html?i=0) */
import { getModelsData, resolveModelFile, resolveModelTextures, resolveModelThumb } from "./model-data.js";

(async () => {
  const canvas = document.getElementById("model-scene");
  const caption = document.getElementById("model-caption");
  const title = document.querySelector('[data-field="model-title"]');
  const type = document.querySelector('[data-field="model-type"]');
  const desc = document.querySelector('[data-field="model-desc"]');
  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get("i") || "0", 10);

  let models;
  try {
    const data = await getModelsData();
    models = data.models || [];
  } catch (err) {
    console.error("Failed to load model:", err);
    if (caption) caption.textContent = "Could not load model data.";
    return;
  }

  const model = models[idx] || models[0] || null;
  if (!model) {
    if (title) title.textContent = "Model not found";
    if (caption) caption.textContent = "No model entries found.";
    return;
  }

  if (title) title.textContent = model.title;
  if (type) type.textContent = (model.type || "3D model").toUpperCase();
  if (desc) desc.textContent = model.description || "";
  document.title = model.title + " — Zulfekar Ahmad";

  // Update OG/Twitter meta dynamically so JS-aware crawlers / in-app browsers show model-specific preview.
  // NOTE: WhatsApp/Facebook crawlers do NOT execute JS, so they will still see the static tags in model.html.
  // For per-model previews on those platforms you need server-side rendering or a Cloudflare Worker / Netlify Function
  // that returns model-specific meta based on ?i=.
  try {
    const SITE_BASE = "https://3dartistzulfekar.github.io/Portfolio";
    const pageUrl = SITE_BASE + "/model.html?i=" + idx;
    const descText = model.description || "Zulfekar Ahmad — 3D assets in full view.";
    const setMeta = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute("content", val);
    };
    setMeta('meta[property="og:title"]', model.title + " — Zulfekar Ahmad");
    setMeta('meta[property="og:description"]', descText);
    setMeta('meta[property="og:url"]', pageUrl);
    setMeta('meta[name="twitter:title"]', model.title + " — Zulfekar Ahmad");
    setMeta('meta[name="twitter:description"]', descText);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", pageUrl);
    // Use model thumbnail as share image if available, else keep default og-image
    if (model.thumbnail) {
      const thumbUrl = await resolveModelThumb(model);
      if (thumbUrl) {
        const absThumb = thumbUrl.startsWith("http") ? thumbUrl : new URL(thumbUrl, SITE_BASE + "/").href;
        setMeta('meta[property="og:image"]', absThumb);
        setMeta('meta[property="og:image:secure_url"]', absThumb);
        setMeta('meta[name="twitter:image"]', absThumb);
      }
    }
  } catch (_) {}

  if (canvas) {
    const url = await resolveModelFile(model);
    const textures = await resolveModelTextures(model);
    // loader elements — the viewer (init.js) drives them, but we keep a handle for safety
    const loaderEl = document.getElementById("model-loader");
    const loaderBar = document.getElementById("model-loader-bar");
    const loaderStatus = document.getElementById("model-loader-status");
    const entry = window.zulfCreateViewer(canvas, {
      url,
      format: model.file,
      textures,
      label: model.title,
      onCaption: (text) => {
        if (caption) caption.textContent = text;
      },
      onProgress: (pct) => {
        // viewer already updates the bar; keep aria status in sync for edge cases
        if (loaderBar) loaderBar.style.width = pct + "%";
        if (loaderStatus && pct < 100) loaderStatus.textContent = "Loading assets… " + pct + "%";
      },
      onReady: () => {
        if (caption && caption.textContent === "Loading model…") {
          caption.textContent = model.title;
        }
      },
    });
    // safety: if viewer failed to init, dismiss loader so page is not stuck
    if (!entry && loaderEl) {
      loaderEl.classList.add("is-hidden");
      loaderEl.setAttribute("aria-busy", "false");
      document.querySelector(".model-stage")?.classList.add("is-ready");
      if (caption) caption.textContent = "Could not load 3D preview.";
    }

    /* download the model file */
    const dl = document.getElementById("btn-download");
    if (dl) {
      if (url) {
        dl.href = url;
        dl.setAttribute(
          "download",
          String(model.file || "model")
            .split("/")
            .pop()
            .split("?")[0] || "model"
        );
      } else {
        dl.hidden = true;
      }
    }

    /* full screen toggle */
    const fsBtn = document.getElementById("btn-fullscreen");
    const stage = document.querySelector(".model-stage");
    if (fsBtn && stage) {
      if (!stage.requestFullscreen) {
        fsBtn.hidden = true;
      } else {
        fsBtn.addEventListener("click", () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            stage.requestFullscreen();
          }
        });
        document.addEventListener("fullscreenchange", () => {
          const active = document.fullscreenElement === stage;
          fsBtn.setAttribute("aria-label", active ? "Exit full screen" : "Full screen");
          window.dispatchEvent(new Event("resize"));
        });
      }
    }
  }
})();
