/* admin — sign in and manage models. Uploads set the file path
   automatically and push both the model file and models.json to GitHub. */
import {
  getConfig,
  hasToken,
  getJsonFile,
  putJsonFile,
  putFileBinary,
  deleteFile,
  listDir,
  repoPathFromUrl,
  rawUrl,
  setToken,
  verifyToken
} from "./github.js";
import { idbPut, idbDelete, saveAdminModels, clearAdminModels } from "./model-data.js";

(() => {
  "use strict";

  const ADMIN_USER = "zulfi";
  const ADMIN_PASS = "zulfi";
  const AUTH_KEY = "zulf-admin-auth";
  const GH_TOKEN_KEY = "zulf-gh-token";

  const $ = (sel) => document.querySelector(sel);

  let cfg = getConfig();
  let baseData = null;
  let baseSha = null;
  let models = [];
  let editingIndex = -1;
  let pendingFile = null;
  let pendingThumb = null;
  let pendingTextures = [];
  let activeUploads = [];
  let uploadFolder = null;

  const isAuthed = () => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch (err) {
      return false;
    }
  };

  const sanitize = (name) =>
    name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

  /* GitHub's contents API rejects anything over 100 MB and base64 inflates
     the payload by ~33% — stop obvious failures before they upload */
  const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  function flash(message, isError) {
    const el = $("#admin-status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("admin-note-error", !!isError);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => {
      el.textContent = "";
      el.classList.remove("admin-note-error");
    }, 8000);
  }

  function showPanel() {
    $("#login-card").hidden = true;
    $("#panel").hidden = false;
  }

  const esc = (v) =>
    String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function renderList() {
    const list = $("#model-list");
    list.innerHTML = "";
    if (!models.length) {
      const li = document.createElement("li");
      li.className = "admin-empty";
      li.textContent = "No models yet. Upload a file above.";
      list.appendChild(li);
      return;
    }
    models.forEach((model, i) => {
      const li = document.createElement("li");
      li.className = "admin-row";
      li.innerHTML =
        '<div class="admin-row-info">' +
        "<strong>" + esc(model.title) + "</strong>" +
        '<span class="admin-row-meta">' + esc(model.type || "3D model") + " · " + esc(model.file || "uploaded file") + (model.thumbnail ? " · thumb ✓" : " · no thumb") + (model.textures && model.textures.length ? " · " + model.textures.length + " tex" : "") + "</span>" +
        "</div>" +
        '<div class="admin-row-actions">' +
        '<button class="btn btn-secondary" type="button" data-edit="' + i + '">Edit</button>' +
        '<button class="btn btn-danger" type="button" data-del="' + i + '">Delete</button>' +
        "</div>";
      li.querySelector('[data-edit]').addEventListener("click", () => startEdit(i));
      li.querySelector('[data-del]').addEventListener("click", () => removeModel(i));
      list.appendChild(li);
    });
  }

  function startEdit(i) {
    editingIndex = i;
    const model = models[i];
    $("#f-title").value = model.title || "";
    $("#f-type").value = model.type || "";
    $("#f-desc").value = model.description || "";
    $("#f-upload").value = "";
    $("#f-upload").required = false;
    pendingFile = null;
    pendingTextures = [];
    const f = folderOf(model.file);
    uploadFolder = isModelFolder(f) ? f : null;
    $("#file-path-note").textContent = "Current file: " + (model.file || "uploaded file");
    $("#f-thumb").value = "";
    pendingThumb = null;
    $("#thumb-path-note").textContent = model.thumbnail
      ? "Current thumbnail: " + model.thumbnail
      : "No thumbnail set — \"No thumbnail\" will be shown on the Models page.";
    $("#f-textures").value = "";
    $("#texture-path-note").textContent =
      (model.textures && model.textures.length
        ? "Current textures: " + model.textures.length + " file(s) — new uploads are added to them."
        : "Optional — texture images are matched to the model by filename.");
    $("#form-submit").textContent = "Save changes";
    $("#form-cancel").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeModel(i) {
    const model = models[i];
    if (!model) return;
    if (!confirm('Delete "' + model.title + '"? Its folder (model, textures, thumbnail) will be removed from GitHub.')) return;

    if (hasToken()) {
      try {
        let repoPath = repoPathFromUrl(cfg, model.file);
        if (!repoPath && model.file && model.file.indexOf(cfg.modelsDir) === 0) {
          repoPath = model.file;
        }
        const folder = folderOf(repoPath);

        if (isModelFolder(folder)) {
          /* per-model folder — remove everything inside it */
          const files = await listDir(cfg, folder);
          for (const p of files) {
            try {
              await deleteFile(cfg, p);
            } catch (err) {
              console.warn("Delete failed for " + p + ":", err);
            }
          }
        } else {
          /* legacy flat layout — remove the file, its thumbnail and its textures */
          if (repoPath) await deleteFile(cfg, repoPath);

          const texPaths = (model.textures || [])
            .map((t) => {
              const p = typeof t === "string" ? t : t && t.path;
              if (!p) return null;
              let rp = repoPathFromUrl(cfg, p);
              if (!rp && p.indexOf(cfg.modelsDir) === 0) rp = p;
              return rp;
            })
            .filter(Boolean);
          for (const p of texPaths) {
            try {
              await deleteFile(cfg, p);
            } catch (err) {
              console.warn("Texture delete failed for " + p + ":", err);
            }
          }

          if (model.thumbnail) {
            let thumbPath = repoPathFromUrl(cfg, model.thumbnail);
            if (!thumbPath && model.thumbnail.indexOf(cfg.modelsDir) === 0) {
              thumbPath = model.thumbnail;
            }
            if (thumbPath) await deleteFile(cfg, thumbPath);
          }
        }
      } catch (err) {
        console.warn("GitHub cleanup failed:", err);
      }
    }

    models.splice(i, 1);
    await persist();
  }

  /* each model lives in its own folder: assets/models/<model-name>/ */
  const folderOf = (path) => {
    const p = String(path || "");
    const idx = p.lastIndexOf("/");
    return idx > 0 ? p.slice(0, idx) : null;
  };

  const isModelFolder = (f) =>
    !!f && f !== cfg.modelsDir && f.indexOf(cfg.modelsDir + "/") === 0;

  function folderFor(fallbackName) {
    if (uploadFolder && isModelFolder(uploadFolder)) return uploadFolder;
    const t = sanitize($("#f-title").value.trim()).toLowerCase();
    const wanted = t || sanitize(String(fallbackName || "model").replace(/\.[^.]+$/, "")).toLowerCase() || "model";

    /* two models sharing a title would otherwise share a folder and the
       second upload would silently overwrite the first one's files */
    const taken = new Set();
    models.forEach((m, i) => {
      if (editingIndex >= 0 && i === editingIndex) return;
      const f = folderOf(m.file);
      if (f && f.indexOf(cfg.modelsDir + "/") === 0) {
        taken.add(f.slice(cfg.modelsDir.length + 1).toLowerCase());
      }
    });
    let name = wanted;
    let n = 2;
    while (taken.has(name)) name = wanted + "-" + n++;
    return cfg.modelsDir + "/" + name;
  }

  async function uploadAsset(file, kind) {
    const isThumb = kind === "thumb";
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        '"' + file.name + '" is ' + (file.size / 1024 / 1024).toFixed(1) +
        " MB — GitHub rejects uploads over ~100 MB. Use a file under 80 MB."
      );
    }
    const name = sanitize(file.name);
    const base64 = await fileToBase64(file);
    const folder = folderFor(file.name);

    if (hasToken()) {
      try {
        const repoPath = folder + "/" + name;
        const path = await putFileBinary(cfg, repoPath, base64);
        uploadFolder = folder;
        return { path };
      } catch (err) {
        console.error("GitHub upload failed:", err);
        flash("GitHub upload failed: " + err.message, true);
      }
    } else if (!isThumb && kind !== "tex") {
      $("#file-path-note").textContent =
        "GitHub upload unavailable — the model is stored in this browser only.";
    }

    const blobId = kind + "-" + Date.now() + "-" + name;
    await idbPut(blobId, file);
    uploadFolder = folder;
    return { path: rawUrl(cfg, folder + "/" + name), blobId };
  }

  function stripBlob(models) {
    return models.map((m) => {
      const copy = Object.assign({}, m);
      delete copy.blobId;
      delete copy.thumbBlobId;
      copy.textures = (m.textures || [])
        .map((t) => (t && typeof t === "object" ? t.path : t))
        .filter(Boolean);
      if (!copy.textures.length) delete copy.textures;
      return copy;
    });
  }

  /* when an edit replaces the model file or thumbnail, remove the old
     copies so GitHub never accumulates orphaned versions */
  async function cleanupReplacedAssets(previous, current) {
    if (!previous) return;

    const repoPathOf = (p) => {
      if (!p) return null;
      let rp = repoPathFromUrl(cfg, p);
      if (!rp && p.indexOf(cfg.modelsDir) === 0) rp = p;
      return rp;
    };

    if (hasToken()) {
      const stale = [];
      /* only when the path actually changed — a same-name re-upload was
         already overwritten in place and must NOT be deleted */
      if (
        current.file && previous.file &&
        current.file !== previous.file
      ) {
        const p = repoPathOf(previous.file);
        if (p) stale.push(p);
      }
      if (
        current.thumbnail && previous.thumbnail &&
        current.thumbnail !== previous.thumbnail
      ) {
        const p = repoPathOf(previous.thumbnail);
        if (p) stale.push(p);
      }
      for (const p of stale) {
        try {
          await deleteFile(cfg, p);
        } catch (err) {
          console.warn("Could not delete replaced asset " + p + ":", err);
          flash("Saved — but the old file could not be removed from GitHub (" + p + ").", true);
        }
      }
    }

    /* browser-only copies of replaced assets */
    try {
      if (previous.blobId && previous.blobId !== current.blobId) await idbDelete(previous.blobId);
      if (previous.thumbBlobId && previous.thumbBlobId !== current.thumbBlobId) await idbDelete(previous.thumbBlobId);
    } catch (err) {
      console.warn("Local cleanup failed:", err);
    }
  }

  async function persist() {
    const out = baseData ? JSON.parse(JSON.stringify(baseData)) : { models: [] };
    out.models = stripBlob(models);

    if (hasToken()) {
      try {
        const res = await putJsonFile(cfg, out, baseSha);
        if (res && res.content) baseSha = res.content.sha;
        clearAdminModels();
        flash("Saved to GitHub — models.json and the model files are live.");
        renderList();
        return;
      } catch (err) {
        console.error("GitHub save failed:", err);
        saveAdminModels(models);
        flash("GitHub save failed: " + err.message, true);
        renderList();
        return;
      }
    }

    saveAdminModels(models);
    flash("GitHub save failed — changes saved on this browser only.", true);
    renderList();
  }

  async function submitForm(e) {
    e.preventDefault();
    const entry = {
      title: $("#f-title").value.trim(),
      type: $("#f-type").value.trim() || "3D model",
      description: $("#f-desc").value.trim(),
    };
    if (!entry.title) {
      flash("Give the model a title before saving.", true);
      $("#f-title").focus();
      return;
    }

    if (activeUploads.length) {
      const btn = $("#form-submit");
      btn.disabled = true;
      btn.textContent = "Uploading…";
      try {
        await Promise.all(activeUploads);
      } finally {
        btn.disabled = false;
        btn.textContent = editingIndex >= 0 ? "Save changes" : "Add model";
      }
      activeUploads = [];
    }

    if (pendingFile) {
      entry.file = pendingFile.path;
      if (pendingFile.blobId) entry.blobId = pendingFile.blobId;
    } else if (editingIndex >= 0) {
      entry.file = models[editingIndex].file;
      if (models[editingIndex].blobId) entry.blobId = models[editingIndex].blobId;
    } else {
      flash("Upload a model file first.", true);
      return;
    }

    if (pendingThumb) {
      entry.thumbnail = pendingThumb.path;
      if (pendingThumb.blobId) entry.thumbBlobId = pendingThumb.blobId;
    } else if (editingIndex >= 0 && models[editingIndex].thumbnail) {
      entry.thumbnail = models[editingIndex].thumbnail;
      if (models[editingIndex].thumbBlobId) entry.thumbBlobId = models[editingIndex].thumbBlobId;
    }

    entry.textures = (editingIndex >= 0 ? models[editingIndex].textures || [] : [])
      .concat(pendingTextures);

    const previous = editingIndex >= 0 ? models[editingIndex] : null;

    if (editingIndex >= 0) {
      models[editingIndex] = entry;
      editingIndex = -1;
      $("#form-submit").textContent = "Add model";
      $("#form-cancel").hidden = true;
      $("#f-upload").required = true;
    } else {
      models.push(entry);
    }

    $("#model-form").reset();
    pendingFile = null;
    pendingThumb = null;
    pendingTextures = [];
    uploadFolder = null;
    activeUploads = [];
    $("#file-path-note").textContent = "Upload a file — the path is filled in automatically.";
    $("#thumb-path-note").textContent = "Optional — upload a thumbnail to show on the Models page. If none, \"No thumbnail\" is shown.";
    $("#texture-path-note").textContent = "Optional — texture images are matched to the model by filename.";
    await persist();
    await cleanupReplacedAssets(previous, entry);
  }

  function exportJson() {
    const out = baseData ? JSON.parse(JSON.stringify(baseData)) : { models: [] };
    out.models = stripBlob(models);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = cfg.jsonPath;
    a.click();
    URL.revokeObjectURL(a.href);
    flash(cfg.jsonPath + " downloaded.");
  }

  async function loadFromGitHub() {
    cfg = getConfig();
    baseData = null;
    baseSha = null;
    models = [];
    try {
      const got = await Promise.race([
        getJsonFile(cfg),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("GitHub did not respond in time.")), 8000)
        ),
      ]);
      if (got) {
        baseData = got.data;
        baseSha = got.sha;
        const arr = Array.isArray(got.data) ? got.data : got.data.models;
        models = Array.isArray(arr) ? arr : [];
        flash("Loaded models.json from GitHub (" + cfg.owner + "/" + cfg.repo + ").");
      } else {
        flash("models.json not found on GitHub yet — it will be created on first save.");
      }
    } catch (err) {
      console.error("GitHub load failed:", err);
      flash("Could not read models.json from GitHub: " + err.message, true);
      try {
        const res = await fetch("data/models.json");
        if (res.ok) {
          const data = await res.json();
          models = Array.isArray(data) ? data : data.models || [];
        }
      } catch (err2) {}
    }
    renderList();
  }

  function init() {
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = $("#login-user").value.trim();
      const pass = $("#login-pass").value;
      const token = $("#github-token").value.trim();

      if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        $("#login-error").textContent = "Incorrect username or password.";
        $("#login-error").hidden = false;
        return;
      }

      const submitBtn = $("#login-form").querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying…";
      try {
        const check = await Promise.race([
          verifyToken(getConfig(), token),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("GitHub did not respond — check your connection.")), 10000)
          ),
        ]);
        if (!check.ok) {
          $("#login-error").textContent = check.reason;
          $("#login-error").hidden = false;
          return;
        }
        try {
          sessionStorage.setItem(AUTH_KEY, "1");
        } catch (err) {}
        if (token) setToken(token);
        $("#login-error").hidden = true;
        showPanel();
        loadFromGitHub();
      } catch (err) {
        $("#login-error").textContent =
          err && err.message ? err.message : "Could not verify the token.";
        $("#login-error").hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    });

    $("#logout-btn").addEventListener("click", () => {
      try {
        sessionStorage.removeItem(AUTH_KEY);
      } catch (err) {}
      location.reload();
    });

    $("#export-btn").addEventListener("click", exportJson);
    $("#model-form").addEventListener("submit", submitForm);

    $("#form-cancel").addEventListener("click", () => {
      editingIndex = -1;
      $("#model-form").reset();
      $("#form-submit").textContent = "Add model";
      $("#form-cancel").hidden = true;
      $("#f-upload").required = true;
      $("#file-path-note").textContent = "Upload a file — the path is filled in automatically.";
      $("#thumb-path-note").textContent = "Optional — upload a thumbnail to show on the Models page. If none, \"No thumbnail\" is shown.";
      $("#texture-path-note").textContent = "Optional — texture images are matched to the model by filename.";
      pendingFile = null;
      pendingThumb = null;
      pendingTextures = [];
      uploadFolder = null;
      activeUploads = [];
    });

    $("#f-upload").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const p = uploadAsset(file, "model")
        .then((res) => {
          pendingFile = res;
          $("#file-path-note").textContent = "Uploaded — path: " + res.path;
        })
        .catch((err) => {
          console.error("Upload failed:", err);
          flash("Upload failed: " + err.message, true);
        });
      activeUploads.push(p);
    });

    $("#f-thumb").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const p = uploadAsset(file, "thumb")
        .then((res) => {
          pendingThumb = res;
          $("#thumb-path-note").textContent = "Uploaded — path: " + res.path;
        })
        .catch((err) => {
          console.error("Thumbnail upload failed:", err);
          flash("Thumbnail upload failed: " + err.message, true);
        });
      activeUploads.push(p);
    });

    $("#f-textures").addEventListener("change", (e) => {
      const files = Array.from((e.target.files && e.target.files) || []);
      if (!files.length) return;
      files.forEach((file) => {
        const p = uploadAsset(file, "tex")
          .then((res) => {
            pendingTextures.push(res);
            $("#texture-path-note").textContent =
              pendingTextures.length +
              " texture(s) ready — matched to the model by filename.";
          })
          .catch((err) => {
            console.error("Texture upload failed:", err);
            flash("Texture upload failed: " + err.message, true);
          });
        activeUploads.push(p);
      });
    });

    if (isAuthed()) {
      showPanel();
      loadFromGitHub();
    }
  }

  init();
})();