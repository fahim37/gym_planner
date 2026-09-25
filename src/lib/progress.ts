"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Completed program days, kept in this browser only. */
const KEY = (program: string) => `progress:${program}`;
const listeners = new Set<() => void>();
const EMPTY: number[] = [];
const snapshots = new Map<string, { raw: string | null; value: number[] }>();

function read(program: string): number[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY(program));
  } catch {
    return EMPTY;
  }
  const cached = snapshots.get(program);
  if (cached && cached.raw === raw) return cached.value;
  let value = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((n) => typeof n === "number");
  } catch {
    // Corrupt entry: treat as no progress.
  }
  snapshots.set(program, { raw, value });
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useProgress(program: string) {
  const done = useSyncExternalStore(subscribe, () => read(program), () => EMPTY);
  const markDone = useCallback(
    (day: number) => {
      const next = Array.from(new Set([...read(program), day])).sort((a, b) => a - b);
      try {
        localStorage.setItem(KEY(program), JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode); progress just won't persist.
      }
      listeners.forEach((l) => l());
    },
    [program],
  );
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY(program));
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  }, [program]);
  return { done, markDone, reset };
}

const EMPTY_MAP: Record<string, number[]> = {};
const maps = new Map<string, { values: number[][]; value: Record<string, number[]> }>();

/** Completed days for several programs at once (e.g. a "continue where you left off" card). */
export function useProgressMap(programs: readonly string[]) {
  const id = programs.join("|");
  const get = () => {
    const values = programs.map(read);
    const cached = maps.get(id);
    if (cached && cached.values.every((v, i) => v === values[i])) return cached.value;
    const value = Object.fromEntries(programs.map((p, i) => [p, values[i]]));
    maps.set(id, { values, value });
    return value;
  };
  return useSyncExternalStore(subscribe, get, () => EMPTY_MAP);
}
