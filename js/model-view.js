/* model viewer page — full-view turntable for one model (model.html?i=0) */
import { getModelsData, resolveModelFile, resolveModelTextures } from "./model-data.js";

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

  if (canvas) {
    const url = await resolveModelFile(model);
    const textures = await resolveModelTextures(model);
    window.zulfCreateViewer(canvas, {
      url,
      format: model.file,
      textures,
      label: model.title,
      onCaption: (text) => {
        if (caption) caption.textContent = text;
      },
    });

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
