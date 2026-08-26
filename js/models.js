/* models page — renders model cards with thumbnails */
import { getModelsData, resolveModelThumb } from "./model-data.js";

/* data content is untrusted — escape before it touches innerHTML */
const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
  const cards = models.map((model, i) => {
    const card = document.createElement("a");
    card.className = "model-card reveal";
    card.href = "model.html?i=" + i;
    card.setAttribute("aria-label", "Open " + (model.title || "3D model"));
    card.innerHTML =
      '<figure class="model-fig' + (model.thumbnail ? "" : " model-fig-none") + '">' +
      (model.thumbnail
        ? '<img class="model-thumb" alt="' + esc(model.title) + '" loading="lazy">'
        : '<span class="model-no-thumb">No thumbnail</span>') +
      "</figure>" +
      '<div class="model-info">' +
      '<div class="model-type">' + esc((model.type || "3D model").toUpperCase()) + "</div>" +
      '<h2 class="model-title">' + esc(model.title) + "</h2>" +
      '<p class="model-desc">' + esc(model.description || "") + "</p>" +
      "</div>";
    grid.appendChild(card);
    return card;
  });

  models.forEach(async (model, i) => {
    if (!model.thumbnail) return;
    const src = await resolveModelThumb(model);
    const img = cards[i].querySelector(".model-thumb");
    if (!img) return;
    if (src) {
      /* a dead thumbnail URL should never show a broken-image glyph */
      img.addEventListener("error", () => {
        const fig = img.closest(".model-fig");
        if (fig) {
          fig.classList.add("model-fig-none");
          fig.innerHTML = '<span class="model-no-thumb">No thumbnail</span>';
        }
      });
      img.src = src;
    } else {
      const fig = img.closest(".model-fig");
      if (fig) {
        fig.classList.add("model-fig-none");
        fig.innerHTML = '<span class="model-no-thumb">No thumbnail</span>';
      }
    }
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
