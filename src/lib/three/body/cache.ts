import { buildBodyData, type BodyData, type BuildOptions } from "./build";

export type { BodyData };

/** Bump when the sculpt or baked attributes change, to invalidate cached meshes. */
const VERSION = "body-v53";
const DB = "ironform-body";
const KEYS = ["position", "normal", "bones", "weights", "info", "fibre", "extra", "index", "bind"] as const;

export type MeshTier = "high" | "medium" | "low";

/** Meshing resolution (cm per voxel) of each quality tier. */
export const MESH_TIERS: Record<MeshTier, Required<BuildOptions>> = {
  high: { body: 0.55, head: 0.24, hand: 0.19, foot: 0.26 },
  medium: { body: 0.72, head: 0.32, hand: 0.25, foot: 0.34 },
  low: { body: 0.95, head: 0.45, hand: 0.33, foot: 0.45 },
};

/**
 * Picks the mesh tier once per page: `?quality=high|medium|low` overrides;
 * otherwise desktops and high-end phones (many cores, lots of memory, dense
 * screens) get HIGH, small/old devices LOW, everything else MEDIUM.
 */
export function meshTier(): MeshTier {
  if (typeof window === "undefined") return "medium";
  const q = new URLSearchParams(window.location.search).get("quality");
  if (q === "high" || q === "medium" || q === "low") return q;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const touch = matchMedia("(pointer: coarse)").matches;
  if (cores <= 4 || memory <= 3) return "low";
  if (!touch && cores >= 8) return "high";
  if (touch && cores >= 8 && memory >= 6 && (window.devicePixelRatio || 1) >= 2.5) return "high";
  return "medium";
}

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
    const tier = meshTier();
    const key = `${VERSION}-${tier}`;
    const cached = await readCache(key);
    const d = cached ?? (await generate(MESH_TIERS[tier]));
    if (!cached) void writeCache(key, d);
    data = d;
    if (process.env.NODE_ENV !== "production") console.info("[body]", cached ? "cached" : "generated", d.stats);
    return d;
  })();
  return pending;
}

async function generate(opts: BuildOptions): Promise<BodyData> {
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
      worker.postMessage(opts);
    });
  } catch {
    // No module workers (e.g. single-file builds): yield a frame, then build here.
    await new Promise((r) => setTimeout(r, 16));
    return buildBodyData(opts);
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

async function readCache(key: string): Promise<BodyData | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction("mesh").objectStore("mesh").get(key);
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

async function writeCache(key: string, d: BodyData) {
  const db = await openDb();
  if (!db) return;
  try {
    const store = db.transaction("mesh", "readwrite").objectStore("mesh");
    // Drop meshes of older sculpt versions.
    const keys = store.getAllKeys();
    keys.onsuccess = () => keys.result.forEach((k) => String(k).startsWith(VERSION) || store.delete(k));
    store.put(d, key);
  } catch {
    // Storage full or blocked: generation simply runs again next visit.
  }
}
