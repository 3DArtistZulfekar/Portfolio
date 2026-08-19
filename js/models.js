/* models page — renders model cards and boots live previews */
import { getModelsData, resolveModelFile } from "./model-data.js";

(async () => {
  const grid = document.querySelector('[data-field="models"]');
  if (!grid) return;

  let models;
  try {
    const data = await getModelsData();
    models = data.models || [];
  } catch (err) {
    console.error("Failed to load models:", err);
    grid.innerHTML = '<p class="data-error">DATA FAULT — could not load model data.</p>';
    return;
  }

  if (!models.length) {
    grid.innerHTML = '<p class="muted">No models added yet.</p>';
    return;
  }

  grid.innerHTML = "";
  models.forEach((model, i) => {
    const card = document.createElement("article");
    card.className = "model-card reveal";
    card.innerHTML =
      '<figure class="model-fig"><canvas class="model-canvas" aria-hidden="true"></canvas></figure>' +
      '<div class="model-info">' +
      '<div class="model-type">' + (model.type || "3D model").toUpperCase() + "</div>" +
      '<h2 class="model-title">' + model.title + "</h2>" +
      '<p class="model-desc">' + (model.description || "") + "</p>" +
      '<a class="model-link" href="model.html?i=' + i + '">View full' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a>' +
      "</div>";
    grid.appendChild(card);
  });

  document.querySelectorAll(".model-canvas").forEach(async (canvas, i) => {
    const url = await resolveModelFile(models[i]);
    window.zulfCreateViewer(canvas, { url, label: models[i].title });
  });

  if (window.zulfReveal) {
    window.zulfReveal();
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".model-card").forEach((card) => io.observe(card));
  } else {
    document.querySelectorAll(".model-card").forEach((card) => card.classList.add("in"));
  }
})();
