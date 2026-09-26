/**
 * Text helpers for exercise search: normalising, tokenising, a light stemmer and a
 * bounded Damerau-Levenshtein distance for typo tolerance.
 */

/** Lower case, no accents, hyphens/slashes as spaces, other punctuation dropped. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’']/g, "")
    .replace(/[-–—_/+&]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

/**
 * A light English stemmer, good enough to meet "curls"/"curl", "pressing"/"press",
 * "lunges"/"lunge", "raises"/"raise", "flies"/"fly" and "stretches"/"stretch".
 */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("ing") && w.length > 5) {
    const b = w.slice(0, -3);
    // "squatting" → "squat", "raising" → "rais" → leave "rais" to meet "raise" via the e-strip below
    return /([bdfgmnprt])\1$/.test(b) ? b.slice(0, -1) : b;
  }
  if (w.endsWith("ed") && w.length > 4 && !w.endsWith("eed")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  // "raise"/"rais", "lunge"/"lung", "crunche"… collapse a trailing silent e.
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  return w;
}

/**
 * Damerau-Levenshtein (optimal string alignment) distance, giving up early once it
 * is certainly above `max` (returns max + 1).
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[n];
}

/** Typos allowed for a word of this length: none for short words, 1 from 4 letters, 2 from 8. */
export const typoBudget = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);
