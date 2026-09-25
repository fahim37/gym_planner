import { buildBodyData, type BodyData } from "./build";

export type { BodyData };

/** Bump when the sculpt or baked attributes change, to invalidate cached meshes. */
const VERSION = "body-v13";
const DB = "ironform-body";
const KEYS = ["position", "normal", "bones", "weights", "info", "fibre", "extra", "index", "bind"] as const;

let data: BodyData | null = null;
let pending: Promise<BodyData> | null = null;

/** The generated body if it is ready, else null (see loadBodyData). */
export function peekBodyData(): BodyData | null {
  return data;
}

/**
 * The generated body mesh, built once per page and shared by every stage:
 * read from IndexedDB when cached, otherwise generated in a Web Worker
 * (falling back to the main thread where workers aren't available).
 */
export function loadBodyData(): Promise<BodyData> {
  pending ??= (async () => {
    const cached = await readCache();
    const d = cached ?? (await generate());
    if (!cached) void writeCache(d);
    data = d;
    if (process.env.NODE_ENV !== "production") console.info("[body]", cached ? "cached" : "generated", d.stats);
    return d;
  })();
  return pending;
}

async function generate(): Promise<BodyData> {
  try {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    return await new Promise<BodyData>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<BodyData>) => {
        worker.terminate();
        resolve(e.data);
      };
      worker.onerror = (e) => {
        worker.terminate();
        reject(e);
      };
      worker.postMessage(null);
    });
  } catch {
    // No module workers (e.g. single-file builds): yield a frame, then build here.
    await new Promise((r) => setTimeout(r, 16));
    return buildBodyData();
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("mesh");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readCache(): Promise<BodyData | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction("mesh").objectStore("mesh").get(VERSION);
      req.onsuccess = () => {
        const v = req.result as BodyData | undefined;
        resolve(v && KEYS.every((k) => v[k]) ? v : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeCache(d: BodyData) {
  const db = await openDb();
  if (!db) return;
  try {
    const store = db.transaction("mesh", "readwrite").objectStore("mesh");
    store.clear();
    store.put(d, VERSION);
  } catch {
    // Storage full or blocked: generation simply runs again next visit.
  }
}
