/* shared model data — GitHub models.json first, then local data/models.json */
import { getConfig, rawUrl, getJsonFile } from "./github.js";

const STORE_KEY = "zulf-admin";
const DB_NAME = "zulf-models";
const FILE_STORE = "files";

const openDB = () =>
  new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => {
      rq.result.createObjectStore(FILE_STORE);
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });

export const idbPut = (key, blob) =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORE, "readwrite");
        tx.objectStore(FILE_STORE).put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );

export const idbGet = (key) =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const rq = db.transaction(FILE_STORE, "readonly").objectStore(FILE_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
      })
  );

export const idbDelete = (key) =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(FILE_STORE, "readwrite");
        tx.objectStore(FILE_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );

export function saveAdminModels(models) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ models }));
    return true;
  } catch (err) {
    return false;
  }
}

export function clearAdminModels() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch (err) {}
}

export function getModelsJsonUrl() {
  const cfg = getConfig();
  return rawUrl(cfg, cfg.jsonPath);
}

/* never let a hung GitHub request freeze the page — race it against a
   timer so the local fallback can take over */
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms)
    ),
  ]);

export async function getModelsData() {
  const cfg = getConfig();

  try {
    const got = await withTimeout(getJsonFile(cfg), 6000, "GitHub read");
    if (got) {
      const arr = Array.isArray(got.data) ? got.data : got.data.models;
      if (Array.isArray(arr)) return { models: arr, source: "github" };
    }
  } catch (err) {
    console.warn("GitHub models.json unavailable:", err);
  }

  const res = await fetch("data/models.json");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : data.models;
  return { models: arr || [], source: "json" };
}

export async function resolveModelFile(model) {
  if (model && model.blobId) {
    try {
      const blob = await idbGet(model.blobId);
      if (blob) return URL.createObjectURL(blob);
    } catch (err) {}
  }
  return model ? model.file : null;
}

export async function resolveModelThumb(model) {
  if (model && model.thumbBlobId) {
    try {
      const blob = await idbGet(model.thumbBlobId);
      if (blob) return URL.createObjectURL(blob);
    } catch (err) {}
  }
  return model ? model.thumbnail : null;
}

/* texture entries are repo paths, or {path, blobId} for browser-only uploads.
   Returns [{name, url}] so the viewer can match loader requests by filename. */
export async function resolveModelTextures(model) {
  const list = (model && model.textures) || [];
  const out = [];
  for (const t of list) {
    if (!t) continue;
    const path = typeof t === "string" ? t : t.path;
    if (!path) continue;
    const name = decodeURIComponent(path.split(/[\\/]/).pop().split("?")[0]);
    if (typeof t === "object" && t.blobId) {
      try {
        const blob = await idbGet(t.blobId);
        if (blob) {
          out.push({ name: name.toLowerCase(), url: URL.createObjectURL(blob) });
          continue;
        }
      } catch (err) {}
    }
    out.push({ name: name.toLowerCase(), url: path });
  }
  return out;
}