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

export async function getModelsData() {
  const cfg = getConfig();

  try {
    const got = await getJsonFile(cfg);
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