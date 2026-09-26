"use client";

import { useEffect, useMemo, useState } from "react";
import type { Equipment, Exercise, Level } from "@/lib/exercise-types";
import { searchExercises, semanticKeys, type SearchResult } from "./engine";
import { normalize } from "./text";

type OfflineSemantic = (keys: [string, number][]) => Map<string, number> | undefined;

/** Online (Gemini) results per normalised query, shared by every search box. */
const onlineCache = new Map<string, Map<string, number>>();
/** Set when the server has no key or keeps failing: stop asking for this visit. */
let onlineDisabled = false;
let failures = 0;
const ONLINE_DEBOUNCE_MS = 350;

/** Similarities → 0–1 relative scores: the median exercise is 0, the best is 1. */
function relative(results: { slug: string; score: number }[]): Map<string, number> {
  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const med = scores[Math.floor(scores.length / 2)] ?? 0;
  const max = scores[scores.length - 1] ?? 0;
  const span = max - med;
  // A vague query (everything about equally similar) gets less say.
  const confidence = Math.min(1, span / 0.12);
  const out = new Map<string, number>();
  if (span <= 0) return out;
  for (const r of results) if (r.score > med) out.set(r.slug, ((r.score - med) / span) * confidence);
  return out;
}

async function fetchOnline(q: string): Promise<Map<string, number> | undefined> {
  const hit = onlineCache.get(q);
  if (hit) return hit;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/search?q=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
  if (res.status === 503) {
    onlineDisabled = true;
    return undefined;
  }
  if (!res.ok) throw new Error(String(res.status));
  const json = (await res.json()) as { results: { slug: string; score: number }[] };
  const map = relative(json.results);
  onlineCache.set(q, map);
  if (onlineCache.size > 200) onlineCache.delete(onlineCache.keys().next().value!);
  return map;
}

/**
 * Exercise search for a query: the offline engine instantly, re-ranked by the
 * offline semantic vocabulary once it has loaded, and — when online — by Gemini's
 * understanding of the whole query after a short pause in typing.
 */
export function useExerciseSearch(
  q: string,
  filter: { equipment?: Equipment; level?: Level } = {},
): SearchResult & { semantic: "none" | "offline" | "online" } {
  const { equipment, level } = filter;
  const [offline, setOffline] = useState<OfflineSemantic | null>(null);
  const [online, setOnline] = useState<{ q: string; map: Map<string, number> } | null>(null);
  const nq = normalize(q);

  // The semantic vocabulary is a separate chunk, loaded the first time someone searches.
  useEffect(() => {
    if (!nq || offline) return;
    let live = true;
    import("./semantic").then((m) => live && setOffline(() => m.offlineSemantic));
    return () => {
      live = false;
    };
  }, [nq, offline]);

  useEffect(() => {
    if (onlineDisabled || nq.length < 3 || typeof navigator === "undefined" || !navigator.onLine) return;
    if (onlineCache.has(nq)) return;
    let live = true;
    const t = window.setTimeout(() => {
      fetchOnline(nq)
        .then((map) => {
          failures = 0;
          if (live && map) setOnline({ q: nq, map });
        })
        .catch(() => {
          if (++failures >= 3) onlineDisabled = true;
        });
    }, ONLINE_DEBOUNCE_MS);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [nq]);

  return useMemo(() => {
    const on = online?.q === nq ? online.map : onlineCache.get(nq);
    const off = offline && nq ? offline(semanticKeys(q)) : undefined;
    let semantic = on ?? off;
    if (on && off) {
      semantic = new Map<string, number>();
      for (const slug of new Set([...on.keys(), ...off.keys()])) semantic.set(slug, 0.7 * (on.get(slug) ?? 0) + 0.3 * (off.get(slug) ?? 0));
    }
    const where = (e: Exercise) => (!equipment || e.equipment.includes(equipment)) && (!level || e.level === level);
    const result = searchExercises(q, { where, semantic, semanticWeight: on ? 0.5 : 0.35 });
    return { ...result, semantic: on ? "online" : off ? "offline" : "none" };
  }, [q, nq, offline, online, equipment, level]);
}
