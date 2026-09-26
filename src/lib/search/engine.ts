/**
 * Offline exercise search: field-weighted, typo-tolerant, gym-slang aware, with
 * optional semantic (vector) scores blended in.
 *
 * A query is split into units: a phrase the lexicon knows ("leg day", "six pack")
 * or a single word. Each unit has alternatives — the word itself (exact, stem,
 * prefix while typing, or a typo-corrected term) and its synonyms — and an
 * exercise scores a unit by its best alternative, weighted by the field the
 * term was found in (a word in the name counts more than one in the steps).
 * Exercises that match every unit come first; if none do, the best partial
 * matches are shown. Semantic scores (from precomputed embeddings offline, or
 * from Gemini when online) re-rank the matches and add closely related extras.
 */
import { EXERCISES } from "@/data/exercises";
import type { Exercise } from "@/lib/exercise-types";
import { MUSCLES } from "@/lib/muscles";
import { COMPOUNDS, STOP_WORDS, SYNONYMS, SYNONYM_PHRASES } from "./lexicon";
import { editDistance, normalize, stem, tokenize, typoBudget } from "./text";

/** Field weights: where a query term is found decides how much it counts. */
const FIELD = { name: 10, primary: 6, region: 5, equipment: 5, category: 4, secondary: 3, level: 3, mechanics: 3, summary: 2, body: 1 };

interface Doc {
  e: Exercise;
  /** Stemmed term → best field weight it appears in. */
  terms: Map<string, number>;
  name: string;
  nameStems: string[];
}

interface Term {
  /** How the word is usually written (for "Did you mean"). */
  surface: string;
  /** Number of exercises using it. */
  df: number;
}

interface Index {
  docs: Doc[];
  vocab: Map<string, Term>;
  /** Vocabulary terms grouped by first letter, for fast typo lookups. */
  byInitial: Map<string, string[]>;
  synonyms: Map<string, string[][]>;
}

let INDEX: Index | null = null;

function addField(
  terms: Map<string, number>,
  text: string,
  weight: number,
  surfaces: Map<string, Map<string, number>>,
  demote?: (stem: string) => number | undefined,
) {
  const words = splitWords(text);
  const stems = words.map(stem);
  const put = (t: string, w: number) => {
    if ((terms.get(t) ?? 0) < w) terms.set(t, w);
  };
  stems.forEach((s, i) => {
    const w = demote?.(s) ?? weight;
    put(s, w);
    // Adjacent word pairs, so "lower back" or "bench press" can be matched as phrases.
    if (i > 0) put(`${stems[i - 1]} ${s}`, Math.min(w, demote?.(stems[i - 1]) ?? weight));
    const m = surfaces.get(s) ?? new Map<string, number>();
    m.set(words[i], (m.get(words[i]) ?? 0) + weight);
    surfaces.set(s, m);
  });
}

/** Tokens with one-word spellings split the library's way ("pushdown" → "push down"), for index and queries alike. */
const splitWords = (text: string) => tokenize(text).flatMap((w) => (COMPOUNDS[w] ?? w).split(" "));

const stemPhrase = (s: string) => tokenize(s).map(stem).join(" ");

/** Muscle and body-part words ("chest", "back", "glute") with their slang ("pec" → chest). */
const MUSCLE_ALIASES = (() => {
  const out = new Map<string, Set<string>>();
  for (const m of Object.values(MUSCLES))
    for (const t of [m.name, m.region, m.id].flatMap((x) => tokenize(x).map(stem))) out.set(t, new Set([t]));
  for (const [k, vs] of Object.entries(SYNONYMS)) {
    if (k.includes(" ")) continue;
    for (const v of vs) out.get(stemPhrase(v))?.add(stem(k));
  }
  return out;
})();
const MUSCLE_WORDS = new Set([...MUSCLE_ALIASES.values()].flatMap((s) => [...s]));

function buildIndex(): Index {
  const surfaces = new Map<string, Map<string, number>>();
  const docs = EXERCISES.map((e): Doc => {
    const terms = new Map<string, number>();
    const f = (text: string, w: number, demote?: (s: string) => number | undefined) => addField(terms, text, w, surfaces, demote);
    // A muscle word in the name that the exercise doesn't train ("Chest-Supported Row")
    // is a description, not what the exercise is for: it counts like the summary.
    const trains = new Set(
      [...e.primary, ...e.secondary]
        .flatMap((m) => [MUSCLES[m].name, m])
        .concat(e.region)
        .flatMap((t) => tokenize(t).map(stem))
        .flatMap((t) => [t, ...(MUSCLE_ALIASES.get(t) ?? [])]),
    );
    const demote = (st: string) => (MUSCLE_WORDS.has(st) && !trains.has(st) ? FIELD.summary : undefined);
    f(e.name, FIELD.name, demote);
    f(e.slug, FIELD.name - 1, demote);
    for (const m of e.primary) f(MUSCLES[m].name, FIELD.primary);
    for (const m of e.primary) f(MUSCLES[m].latin, FIELD.body);
    f(e.region, FIELD.region);
    for (const q of e.equipment) f(q, FIELD.equipment);
    f(e.category ?? "Strength", FIELD.category);
    for (const m of e.secondary) f(MUSCLES[m].name, FIELD.secondary);
    f(e.level, FIELD.level);
    f(e.mechanics, FIELD.mechanics);
    f(e.summary, FIELD.summary);
    f([...e.steps, ...e.tips].join(" "), FIELD.body);
    return { e, terms, name: normalize(e.name), nameStems: tokenize(e.name).map(stem) };
  });
  const vocab = new Map<string, Term>();
  for (const d of docs)
    for (const t of d.terms.keys()) {
      const v = vocab.get(t);
      if (v) v.df++;
      else {
        const forms = [...(surfaces.get(t) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
        vocab.set(t, { surface: forms[0]?.[0] ?? t, df: 1 });
      }
    }
  const byInitial = new Map<string, string[]>();
  for (const t of vocab.keys()) {
    if (t.includes(" ")) continue;
    const k = t[0];
    byInitial.set(k, [...(byInitial.get(k) ?? []), t]);
  }
  // Synonyms keyed by their stemmed form, values as stemmed token lists.
  const synonyms = new Map<string, string[][]>();
  for (const [k, vs] of Object.entries(SYNONYMS)) synonyms.set(stemPhrase(k), vs.map((v) => tokenize(v).map(stem)));
  return { docs, vocab, byInitial, synonyms };
}


function index(): Index {
  return (INDEX ??= buildIndex());
}

/** A candidate index term for a query word, with how good a match it is (0–1). */
type Cand = [term: string, quality: number];
interface Alt {
  /** Every token must be present; each token lists its candidate terms. */
  tokens: Cand[][];
  factor: number;
  /** Ignore matches in fields weaker than this (words of a phrase found far apart in the steps). */
  minWeight?: number;
}
export interface Unit {
  text: string;
  alts: Alt[];
  /** Typo-corrected spelling, when the word itself is unknown. */
  corrected?: string;
  /** For a two-word unit: the words on their own (used for partial matches). */
  parts?: Unit[];
}
export interface Analysis {
  normalized: string;
  units: Unit[];
  /** Stemmed words and phrases to look up in the semantic vocabulary. */
  keys: string[];
  didYouMean?: string;
}

const PREFIX_MIN = 2;

function fuzzy(ix: Index, s: string): { term: string; d: number }[] {
  const max = typoBudget(s.length);
  if (!max) return [];
  const out: { term: string; d: number }[] = [];
  // Typos rarely hit the first letter; also try a swap of the first two letters.
  const pools = new Set([s[0], s[1]]);
  for (const k of pools)
    for (const t of ix.byInitial.get(k ?? "") ?? []) {
      if (Math.abs(t.length - s.length) > max) continue;
      const d = editDistance(s, t, max);
      if (d <= max) out.push({ term: t, d });
    }
  return out.sort((a, b) => a.d - b.d || (ix.vocab.get(b.term)?.df ?? 0) - (ix.vocab.get(a.term)?.df ?? 0));
}

/** A phrase as required terms: adjacent pairs when the library has them, else each word anywhere. */
function phraseTokens(ix: Index, toks: string[]): Cand[][] {
  if (toks.length > 1) {
    const pairs = toks.slice(1).map((t, i) => `${toks[i]} ${t}`);
    if (pairs.every((p) => ix.vocab.has(p))) return pairs.map((p) => [[p, 1]]);
  }
  return toks.map((t) => [[t, 1]]);
}

function synonymAlts(ix: Index, key: string, factor: number): Alt[] {
  return (ix.synonyms.get(key) ?? []).map((toks) => ({ tokens: phraseTokens(ix, toks), factor, minWeight: toks.length > 1 ? FIELD.summary : 0 }));
}

function wordUnit(ix: Index, w: string, typing: boolean): Unit {
  const s = stem(w);
  const alts: Alt[] = [];
  const direct: Cand[] = [];
  const known = ix.vocab.has(s);
  if (known) direct.push([s, 1]);
  if (typing && w.length >= PREFIX_MIN)
    for (const t of ix.vocab.keys())
      if (t !== s && !t.includes(" ") && t.startsWith(w)) direct.push([t, (known ? 0.35 : 0.55) + 0.4 * (w.length / t.length)]);
  const syn = synonymAlts(ix, s, 0.9);
  let corrected: string | undefined;
  if (!known && !syn.length) {
    // Unknown word: try a typo correction against the library's words and the slang keys.
    const hits = fuzzy(ix, s);
    for (const h of hits.slice(0, 4)) direct.push([h.term, h.d === 1 ? 0.72 : 0.5]);
    if (hits[0] && !direct.some(([, q]) => q > 0.72)) corrected = ix.vocab.get(hits[0].term)?.surface;
    if (!hits.length) {
      const max = typoBudget(s.length);
      let best: [string, number] | null = null;
      for (const k of ix.synonyms.keys()) {
        if (k.includes(" ") || Math.abs(k.length - s.length) > max) continue;
        const d = editDistance(s, k, max);
        if (d <= max && (!best || d < best[1])) best = [k, d];
      }
      if (best) {
        alts.push(...synonymAlts(ix, best[0], best[1] === 1 ? 0.7 : 0.5));
        corrected = Object.keys(SYNONYMS).find((k) => stem(k) === best[0]) ?? best[0];
      }
    }
  }
  if (direct.length) alts.unshift({ tokens: [direct], factor: 1 });
  alts.push(...syn);
  return { text: w, alts, corrected };
}

/** Splits a query into units (known phrases first, then words) and records corrections. */
export function analyze(query: string): Analysis {
  const ix = index();
  const typing = !/\s$/.test(query);
  const raw = splitWords(query);
  const stems = raw.map(stem);
  const units: Unit[] = [];
  const keys: string[] = [];
  let i = 0;
  const fixed: string[] = [];
  while (i < raw.length) {
    // Longest known phrase starting here ("lower back pain" → "back pain" is tried after "lower back").
    let matched = 0;
    for (const p of SYNONYM_PHRASES) {
      const ps = p.split(" ").map(stem);
      if (ps.length > raw.length - i) continue;
      if (ps.every((t, k) => t === stems[i + k])) {
        const key = ps.join(" ");
        units.push({ text: p, alts: [...synonymAlts(ix, key, 1), ...phraseAlt(ix, ps)] });
        keys.push(key);
        fixed.push(...raw.slice(i, i + ps.length));
        matched = ps.length;
        break;
      }
    }
    if (matched) {
      i += matched;
      continue;
    }
    // Two words the library uses together ("lower back", "calf raise") must appear together.
    if (i + 1 < raw.length && !STOP_WORDS.has(raw[i]) && !STOP_WORDS.has(raw[i + 1])) {
      const pair = `${stems[i]} ${stems[i + 1]}`;
      if (ix.vocab.has(pair)) {
        const words = [wordUnit(ix, raw[i], false), wordUnit(ix, raw[i + 1], typing && i + 2 === raw.length)];
        units.push({
          text: `${raw[i]} ${raw[i + 1]}`,
          alts: [
            { tokens: [[[pair, 1]]], factor: 1.15 },
            ...synonymAlts(ix, pair, 0.9),
            // Or both words, each in a meaningful field ("dumbbell curl" → Dumbbell Hammer Curl).
            ...(words.every((w) => w.alts[0]) ? [{ tokens: words.map((w) => w.alts[0].tokens[0]), factor: 0.8, minWeight: FIELD.summary }] : []),
          ],
          parts: words.filter((w) => w.alts.length),
        });
        keys.push(pair);
        fixed.push(raw[i], raw[i + 1]);
        i += 2;
        continue;
      }
    }
    const w = raw[i];
    const last = i === raw.length - 1;
    if (STOP_WORDS.has(w) && raw.length > 1) {
      fixed.push(w);
      i++;
      continue;
    }
    const u = wordUnit(ix, w, typing && last);
    if (typing && last && !u.corrected && fixed.length && !ix.vocab.has(stem(w)) && !ix.synonyms.has(stem(w))) {
      // Finish the word being typed in the suggestion ("benhc pres" → "bench press").
      const best = u.alts[0]?.tokens[0]?.slice().sort((x, y) => y[1] - x[1])[0];
      if (best) u.corrected = ix.vocab.get(best[0])?.surface;
    }
    if (u.alts.length) {
      units.push(u);
      keys.push(stem(u.corrected ? normalize(u.corrected) : w));
    }
    fixed.push(u.corrected ? normalize(u.corrected) : w);
    i++;
  }
  const normalized = raw.join(" ");
  const corrected = fixed.join(" ");
  if (raw.length > 1) keys.unshift(stems.join(" "));
  return { normalized, units, keys, didYouMean: corrected !== normalized ? corrected : undefined };
}

/** A lexicon phrase also matches exercises that simply contain its words. */
function phraseAlt(ix: Index, ps: string[]): Alt[] {
  return ps.every((t) => ix.vocab.has(t)) ? [{ tokens: phraseTokens(ix, ps), factor: 1, minWeight: FIELD.summary }] : [];
}

/** Best score of a unit in a document (field weight × match quality × alternative factor). */
function unitScore(d: Doc, u: Unit): number {
  let best = 0;
  for (const a of u.alts) {
    let min = Infinity;
    for (const cands of a.tokens) {
      let t = 0;
      for (const [term, q] of cands) {
        const w = d.terms.get(term);
        if (w && w >= (a.minWeight ?? 0) && w * q > t) t = w * q;
      }
      if (t < min) min = t;
      if (!min) break;
    }
    const s = min === Infinity ? 0 : min * a.factor;
    if (s > best) best = s;
  }
  return best;
}

export interface Hit {
  exercise: Exercise;
  score: number;
  /** Matched every part of the query (vs a partial or a semantic-only match). */
  full: boolean;
  /** Found only by meaning (no word matched). */
  related: boolean;
}

export interface SearchResult {
  hits: Hit[];
  didYouMean?: string;
}

export interface SearchOptions {
  /** Restricts the candidates (filters). */
  where?: (e: Exercise) => boolean;
  /** Semantic similarity per exercise slug, 0–1 relative to the best match. */
  semantic?: Map<string, number>;
  /** How much the semantic scores count (0–1). */
  semanticWeight?: number;
  /** Add close relatives of the best matches (default true). */
  related?: boolean;
}

/**
 * Ranks exercises for a query. With an empty query every candidate is returned in
 * catalogue order.
 */
export function searchExercises(query: string, opts: SearchOptions = {}): SearchResult {
  const ix = index();
  const docs = opts.where ? ix.docs.filter((d) => opts.where!(d.e)) : ix.docs;
  const a = analyze(query);
  if (!a.units.length) {
    if (!normalize(query)) return { hits: docs.map((d) => ({ exercise: d.e, score: 0, full: true, related: false })) };
    return { hits: [], didYouMean: a.didYouMean };
  }
  const n = a.units.length;
  const qStems = a.normalized.split(" ").map(stem).filter((s) => !STOP_WORDS.has(s));
  const qPhrase = qStems.join(" ");
  const sem = opts.semantic;
  const sw = sem ? (opts.semanticWeight ?? 0.35) : 0;
  const raw = docs.map((d) => a.units.map((u) => unitScore(d, u)));
  // A word that only turns up in the steps doesn't count when enough exercises use it
  // meaningfully ("back" in "keep your back flat" when searching for back exercises).
  const strong = a.units.map((_, k) => raw.filter((r) => r[k] >= FIELD.summary).length >= 6);
  const scored = docs.map((d, di) => {
    let sum = 0;
    let matched = 0;
    raw[di].forEach((s, k) => {
      if (strong[k] && s < FIELD.summary) return;
      if (s > 0) matched++;
      sum += s;
    });
    let lex = sum / (FIELD.name * n);
    if (matched) {
      // Name bonuses: the whole query in the name, the name starting with it, and short names.
      const nameStem = d.nameStems.join(" ");
      if (qPhrase && nameStem === qPhrase) lex += 0.6;
      else if (qPhrase && nameStem.includes(qPhrase)) lex += nameStem.startsWith(qPhrase) ? 0.35 : 0.25;
      const inName = d.nameStems.filter((t) => qStems.some((q) => t === q || (q.length >= PREFIX_MIN && t.startsWith(q)))).length;
      lex += 0.12 * (inName / d.nameStems.length);
      // Focused exercises first: a curl beats a compound lift that also works the biceps.
      lex += 0.08 / d.e.primary.length;
    }
    return { d, lex, matched, sem: sem?.get(d.e.slug) ?? 0 };
  });
  const strict = scored.filter((s) => s.matched === n);
  let hits: Hit[] = strict
    .map((s) => ({ exercise: s.d.e, score: s.lex + sw * s.sem, full: true, related: false }))
    .sort((x, y) => y.score - x.score);
  // The query names an exercise ("leg press"): stragglers that merely share its words go,
  // and its relatives (by muscles and movement, below) follow instead of word matches.
  const named = qStems.length > 1 && strict.some((s) => s.d.nameStems.join(" ").includes(qPhrase));
  if (named) hits = hits.filter((h) => h.score >= 0.2 * hits[0].score);
  // Similarity to the best matches, used to order partial matches and to add relatives.
  const seeds = hits.slice(0, 5);
  const rel = opts.related !== false && seeds.length ? relatedTo(seeds.map((h) => [h.exercise.slug, h.score])) : undefined;
  const loose = a.units.flatMap((u) => u.parts ?? [u]);
  if (!named && strict.length < 5 && loose.length > 1) {
    // Few exact matches: follow with the best partial ones ("cable fly" → other flyes).
    const have = new Set(strict.map((s) => s.d.e.slug));
    const ln = loose.length;
    const minLoose = Math.max(1, Math.ceil(ln / 2));
    // Rarer words decide more: for "cable fly", being a fly matters more than using a cable.
    const per = scored.map((s) => loose.map((u) => unitScore(s.d, u)));
    const idf = loose.map((_, k) => Math.log(1 + docs.length / Math.max(1, per.filter((r) => r[k] >= FIELD.summary).length)));
    const idfSum = idf.reduce((x, y) => x + y, 0);
    const partial = scored
      .map((s, i) => {
        let got = 0;
        let lex = 0;
        per[i].forEach((x, k) => {
          if (x < FIELD.summary) return;
          got++;
          lex += x * idf[k];
        });
        return { s, got, lex: lex / (FIELD.name * idfSum) };
      })
      .filter((p) => !have.has(p.s.d.e.slug))
      .filter((p) => p.got >= minLoose)
      .map((p) => ({ exercise: p.s.d.e, score: p.lex + sw * p.s.sem + 0.4 * (rel?.get(p.s.d.e.slug) ?? 0), full: false, related: false }))
      .sort((x, y) => y.score - x.score)
      .slice(0, strict.length ? 12 : 40);
    hits.push(...partial);
  }
  if (rel) {
    // Close relatives of the best matches (same muscles and movement), after the word matches.
    {
      const have = new Set(hits.map((h) => h.exercise.slug));
      const allowed = new Set(docs.map((d) => d.e.slug));
      const extra = [...rel]
        .filter(([slug, x]) => x >= 0.6 && !have.has(slug) && allowed.has(slug))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([slug, x]): Hit => ({ exercise: ix.docs.find((d) => d.e.slug === slug)!.e, score: 0.1 * x, full: false, related: true }));
      hits.push(...extra);
    }
  }
  if (sem) {
    // Close relatives found only by meaning, after the word matches.
    const have = new Set(hits.map((h) => h.exercise.slug));
    const extra = scored
      .filter((s) => !have.has(s.d.e.slug) && s.sem >= (hits.length ? 0.72 : 0.55))
      .sort((x, y) => y.sem - x.sem)
      .slice(0, hits.length ? 8 : 16)
      .map((s): Hit => ({ exercise: s.d.e, score: sw * s.sem, full: false, related: true }));
    hits.push(...extra);
  }
  return { hits, didYouMean: a.didYouMean };
}

/** Movement patterns: exercises that share one move alike ("fly" ↔ "crossover" via muscles too). */
const PATTERNS = new Map(
  Object.entries({
    squat: "squat", hack: "squat", lunge: "lunge", "step": "lunge", split: "lunge", deadlift: "hinge", "good": "hinge",
    swing: "hinge", press: "press", push: "press", row: "row", pull: "pull", pulldown: "pull", chin: "pull", curl: "curl",
    extension: "extension", pushdown: "extension", kickback: "extension", crusher: "extension", fly: "fly", crossover: "fly",
    deck: "fly", raise: "raise", shrug: "shrug", dip: "dip", crunch: "crunch", "sit": "crunch", plank: "plank", bridge: "bridge",
    thrust: "bridge", stretch: "stretch", pose: "stretch", jump: "jump", carry: "carry", walk: "carry", kick: "kick", twist: "twist",
    hold: "hold", hang: "hold",
  }).map(([k, v]) => [stem(k), v]),
);

let FEATURES: { dims: Map<string, number>; vecs: Map<string, Float32Array> } | null = null;

/**
 * Exercise feature vectors — what it trains, how it moves, with what — for finding
 * close relatives of the best matches (offline "vector search" without a model).
 */
function features() {
  if (FEATURES) return FEATURES;
  const dims = new Map<string, number>();
  const dim = (k: string) => {
    if (!dims.has(k)) dims.set(k, dims.size);
    return dims.get(k)!;
  };
  const raw = EXERCISES.map((e) => {
    const f = new Map<number, number>();
    const put = (k: string, w: number) => f.set(dim(k), Math.max(f.get(dim(k)) ?? 0, w));
    e.primary.forEach((m) => put(`m:${m}`, 1));
    e.secondary.forEach((m) => put(`m:${m}`, 0.35));
    put(`r:${e.region}`, 0.6);
    e.equipment.forEach((q) => put(`q:${q}`, 0.3));
    put(`c:${e.category ?? "Strength"}`, 0.5);
    put(`k:${e.mechanics}`, 0.25);
    const nameStems = splitWords(e.name).map(stem);
    for (const t of nameStems) {
      const p = PATTERNS.get(t);
      if (p) put(`p:${p}`, 0.9);
    }
    // A leg press is a squat pattern on a machine, not a press.
    if (nameStems.join(" ").includes("leg press")) put("p:squat", 0.9);
    return [e.slug, f] as const;
  });
  const vecs = new Map<string, Float32Array>();
  for (const [slug, f] of raw) {
    const v = new Float32Array(dims.size);
    for (const [i, w] of f) v[i] = w;
    const n = Math.hypot(...v) || 1;
    vecs.set(slug, v.map((x) => x / n));
  }
  return (FEATURES = { dims, vecs });
}

/** Similarity (0–1, relative to the best) of every exercise to a weighted set of seed exercises. */
export function relatedTo(seeds: [slug: string, weight: number][]): Map<string, number> {
  const { dims, vecs } = features();
  const q = new Float32Array(dims.size);
  for (const [slug, w] of seeds) vecs.get(slug)?.forEach((x, i) => (q[i] += x * w));
  const qn = Math.hypot(...q) || 1;
  const sims = [...vecs].map(([slug, v]) => [slug, v.reduce((s, x, i) => s + x * q[i], 0) / qn] as const);
  const sorted = sims.map(([, x]) => x).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  const out = new Map<string, number>();
  if (max <= med) return out;
  for (const [slug, x] of sims) if (x > med) out.set(slug, (x - med) / (max - med));
  return out;
}

/** Test hook: rebuilds the index (e.g. after swapping the data). */
export function resetSearchIndex() {
  INDEX = null;
}

/**
 * Stemmed words and phrases of a query to look up in the semantic vocabulary, with
 * weights: the whole query counts most, then the phrases and words it was split into.
 */
export function semanticKeys(query: string): [string, number][] {
  const a = analyze(query);
  const out = new Map<string, number>();
  const add = (k: string, w: number) => k && out.set(k, Math.max(out.get(k) ?? 0, w));
  const words = a.normalized.split(" ").filter((w) => w && !STOP_WORDS.has(w));
  if (words.length > 1) add(words.map(stem).join(" "), 3);
  for (const k of a.keys) add(k, 2);
  for (const w of words) add(stem(w), 1);
  return [...out];
}
