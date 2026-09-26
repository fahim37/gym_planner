/**
 * Builds the semantic search data with Gemini embeddings (run once; the exercise
 * library is fixed):
 *
 * - src/lib/search/semantic-data.ts — for ~2–3k gym words and phrases people type,
 *   their closest exercises and similarity scores (sparse top-K). The app uses it
 *   offline: no model or key at runtime.
 * - src/lib/search/exercise-vectors.ts — every exercise's embedding (int8). Only the
 *   /api/search route uses it, to compare with a query Gemini embeds on the fly.
 *
 * Usage: GEMINI_API_KEY=… node scripts/build-search-vectors.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT_TYPES, LEVELS } from "@/lib/exercise-types";
import { MUSCLES, REGIONS } from "@/lib/muscles";
import { EMBED_DIMS, EMBED_MODEL, exerciseDocument } from "@/lib/search/embed-config";
import { STOP_WORDS, SYNONYMS } from "@/lib/search/lexicon";
import { normalize, stem, tokenize } from "@/lib/search/text";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error("Set GEMINI_API_KEY");
const OUT = join(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."), "src", "lib", "search");
/** Closest exercises kept per vocabulary phrase. */
const TOP_K = 24;

/** Extra things people search for that aren't exercise words. */
const EXTRA = `
build muscle|get stronger|lose fat|burn calories|tone up|get fit|beginner friendly|no equipment needed|quick home workout
bad knees|knee pain|shoulder pain|wrist pain|lower back pain|neck pain|sciatica|bad back|injury friendly|gentle
posture fix|desk worker|office|sitting all day|tight hips|tight hamstrings|tight chest|hunched shoulders
bigger chest|wider shoulders|bigger arms|thicker back|v shape|bigger legs|round glutes|bigger butt|stronger core|flat stomach
abs workout|chest workout|back workout|shoulder workout|arm workout|leg workout|glute workout|core workout|full body workout
explosive power|speed|agility|jump higher|athletic performance|sprinting|football|basketball|boxing|martial arts|climbing
grip|pinch|carry|hang|hold|isometric|static hold|time under tension|tempo|slow|controlled|squeeze|stretch under load
heavy lift|one rep max|powerlifter|bodybuilder|strongman|crossfit|olympic weightlifting|functional training|calisthenics skills
pushing|pulling|squatting|hinging|lunging|carrying|rotating|jumping|climbing|crawling|kicking|twisting|bending|reaching
horizontal press|incline press|decline press|overhead|behind the neck|neutral grip|wide grip|close grip|underhand|overhand
supinated|pronated|isolation exercise|compound lift|machine only|cables only|dumbbells only|barbell only|kettlebell only
resistance band workout|gym beginner|first day at the gym|women|men|seniors|older adults|teenagers|pregnant|postpartum
warm up before lifting|cool down stretch|mobility drill|flexibility routine|morning stretch|before bed|recovery day|rest day
fat burner|metabolic|circuit|interval|tabata|emom|amrap|conditioning finisher|endurance training|stamina builder
sore back|sore legs|sore knees|elbow pain|tennis elbow|runner knee|shin splints|plantar|ankle|hip pain|groin pull
chest fly|rear delt|front raise|lateral raise|curl variations|triceps finisher|biceps peak|forearm size|neck training
`
  .split(/[|\n]/)
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * What people type: the slang and goal phrases, extra goals, muscles, body parts,
 * equipment and styles. Exercise names themselves are left to the word search.
 * Kept under ~700 so a build fits the free tier's 1,000 embeddings a day.
 */
function vocabulary(): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const n = normalize(s);
    if (n && n.length > 1 && !STOP_WORDS.has(n)) out.add(n);
  };
  for (const k of Object.keys(SYNONYMS)) add(k);
  for (const s of EXTRA) add(s);
  for (const m of Object.values(MUSCLES)) [m.name, m.region].forEach(add);
  [...REGIONS, ...EQUIPMENT_TYPES, ...LEVELS, "Strength", "Cardio", "Plyometric", "Mobility", "Compound", "Isolation"].forEach(add);
  return [...out];
}

/** Embeddings already fetched (by task and text), so an interrupted build resumes. */
const CACHE_FILE = join(tmpdir(), "ironform-search-vectors", "embeddings-cache.json");
const cache: Record<string, number[]> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
const saveCache = () => {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache));
};

async function embed(texts: string[], taskType: string, titles?: string[]): Promise<number[][]> {
  const id = (i: number) => `${EMBED_MODEL}:${EMBED_DIMS}:${taskType}:${titles?.[i] ?? ""}:${texts[i]}`;
  const todo = texts.map((_, i) => i).filter((i) => !cache[id(i)]);
  console.log(`${taskType}: ${texts.length - todo.length} cached, ${todo.length} to fetch`);
  for (let b = 0; b < todo.length; b += 100) {
    const batch = todo.slice(b, b + 100);
    const body = {
      requests: batch.map((i) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: texts[i] }] },
        taskType,
        outputDimensionality: EMBED_DIMS,
        ...(titles ? { title: titles[i] } : {}),
      })),
    };
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { embeddings: { values: number[] }[] };
        json.embeddings.forEach((e, k) => (cache[id(batch[k])] = e.values));
        saveCache();
        console.log(`  ${Math.min(b + 100, todo.length)}/${todo.length}`);
        break;
      }
      const text = await res.text();
      if (res.status === 429 && /PerDay/.test(text)) {
        saveCache();
        console.log("Daily embedding quota used up: progress saved, run again after the quota resets (midnight Pacific).");
        process.exit(2);
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        const wait = 15000 * (attempt + 1);
        console.log(`  ${res.status}, retrying in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`embed failed: ${res.status} ${text.slice(0, 300)}`);
    }
  }
  return texts.map((_, i) => cache[id(i)]);
}

const unit = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

const docs = EXERCISES.map(exerciseDocument);
console.log(`exercises: ${docs.length}`);
const exVecs = (await embed(docs, "RETRIEVAL_DOCUMENT", EXERCISES.map((e) => e.name))).map(unit);

const vocab = vocabulary();
console.log(`vocabulary: ${vocab.length}`);
const vVecs = (await embed(vocab, "RETRIEVAL_QUERY")).map(unit);

// Similarity range, for quantising scores into bytes.
const sims = vVecs.map((v) => exVecs.map((e) => dot(v, e)));
const flat = sims.flat().sort((a, b) => a - b);
const LO = flat[Math.floor(flat.length * 0.5)];
const HI = flat[flat.length - 1];
console.log(`similarity: median ${LO.toFixed(3)}, p99 ${flat[Math.floor(flat.length * 0.99)].toFixed(3)}, max ${HI.toFixed(3)}`);

// Vocabulary keyed by its stemmed form (how the search engine looks it up); duplicates merged.
const keyed = new Map<string, number[]>();
vocab.forEach((v, i) => {
  const key = tokenize(v).map(stem).join(" ");
  const prev = keyed.get(key);
  keyed.set(key, prev ? prev.map((x, j) => Math.max(x, sims[i][j])) : sims[i]);
});
const terms = [...keyed.keys()].sort();
const bytes: number[] = [];
for (const t of terms) {
  const row = keyed.get(t)!;
  const top = row
    .map((s, i) => [i, s] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_K);
  for (const [i, s] of top) bytes.push(i, Math.max(0, Math.min(255, Math.round(((s - LO) / (HI - LO)) * 255))));
}
const slugs = EXERCISES.map((e) => e.slug);
writeFileSync(
  join(OUT, "semantic-data.ts"),
  `// Generated by scripts/build-search-vectors.mjs (${EMBED_MODEL}, ${EMBED_DIMS} dims). Do not edit.
/** Exercise slugs, in the order the scores refer to. */
export const SEM_SLUGS: string[] = ${JSON.stringify(slugs)};
/** Stemmed search phrases (see src/lib/search/text.ts). */
export const SEM_TERMS: string[] = ${JSON.stringify(terms)};
/** Per term, ${TOP_K} (exercise index, score byte) pairs, best first. */
export const SEM_TOP_K = ${TOP_K};
/** Score byte b means cosine similarity LO + b / 255 × (HI − LO). */
export const SEM_RANGE: [number, number] = [${LO.toFixed(5)}, ${HI.toFixed(5)}];
export const SEM_DATA = "${Buffer.from(bytes).toString("base64")}";
`,
);

// Exercise vectors for the online route: int8 with one shared scale.
const maxAbs = Math.max(...exVecs.flat().map(Math.abs));
const scale = 127 / maxAbs;
const q = Buffer.alloc(exVecs.length * EMBED_DIMS);
exVecs.forEach((v, i) => v.forEach((x, j) => q.writeInt8(Math.round(x * scale), i * EMBED_DIMS + j)));
writeFileSync(
  join(OUT, "exercise-vectors.ts"),
  `// Generated by scripts/build-search-vectors.mjs (${EMBED_MODEL}, ${EMBED_DIMS} dims). Do not edit.
export const VEC_SLUGS: string[] = ${JSON.stringify(slugs)};
/** Unit vectors as int8: component = byte / VEC_SCALE. */
export const VEC_SCALE = ${scale.toFixed(4)};
export const VEC_DATA = "${q.toString("base64")}";
`,
);
console.log(`wrote semantic-data.ts (${terms.length} terms, ${bytes.length} bytes) and exercise-vectors.ts`);
