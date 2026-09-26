/**
 * Offline semantic scores: each gym word or phrase in the vocabulary was embedded
 * once with Gemini (scripts/build-search-vectors.mjs) and stores its closest
 * exercises. A query's known words and phrases are looked up and their similarity
 * scores averaged — the same ranking as comparing the averaged query vector with
 * every exercise, without shipping a model or a key.
 */
import { SEM_DATA, SEM_RANGE, SEM_SLUGS, SEM_TERMS, SEM_TOP_K } from "./semantic-data";

let bytes: Uint8Array | null = null;
let terms: Map<string, number> | null = null;

function load() {
  if (bytes && terms) return { bytes, terms };
  const bin = atob(SEM_DATA);
  bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  terms = new Map(SEM_TERMS.map((t, i) => [t, i]));
  return { bytes, terms };
}

/** Whether the vocabulary knows a stemmed phrase. */
export const knowsTerm = (key: string) => load().terms.has(key);

/**
 * Semantic similarity per exercise slug for the given stemmed lookup keys (with
 * weights), scaled 0–1 relative to the best exercise and damped when the match is
 * weak overall. Undefined when no key is known.
 */
export function offlineSemantic(keys: [key: string, weight: number][]): Map<string, number> | undefined {
  if (!SEM_TERMS.length) return undefined;
  const { bytes, terms } = load();
  const [lo, hi] = SEM_RANGE;
  const n = SEM_SLUGS.length;
  const sum = new Float64Array(n);
  let wsum = 0;
  for (const [key, w] of keys) {
    const t = terms.get(key);
    if (t === undefined) continue;
    wsum += w;
    // Exercises outside a term's top list score the baseline (0 after scaling).
    for (let k = 0; k < SEM_TOP_K; k++) {
      const o = (t * SEM_TOP_K + k) * 2;
      sum[bytes[o]] += (w * bytes[o + 1]) / 255;
    }
  }
  if (!wsum) return undefined;
  let max = 0;
  for (let i = 0; i < n; i++) if ((sum[i] /= wsum) > max) max = sum[i];
  if (max <= 0) return undefined;
  // Confidence: a strong best match (in cosine terms) counts fully, a vague one less.
  const bestCos = lo + max * (hi - lo);
  const confidence = Math.max(0, Math.min(1, (bestCos - lo) / (0.6 * (hi - lo))));
  const out = new Map<string, number>();
  for (let i = 0; i < n; i++) if (sum[i] > 0) out.set(SEM_SLUGS[i], (sum[i] / max) * confidence);
  return out;
}
