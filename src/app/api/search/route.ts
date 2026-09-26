import type { NextRequest } from "next/server";
import { EMBED_DIMS, EMBED_MODEL } from "@/lib/search/embed-config";
import { VEC_DATA, VEC_SCALE, VEC_SLUGS } from "@/lib/search/exercise-vectors";
import { normalize } from "@/lib/search/text";

/**
 * GET /api/search?q=… — semantic exercise search. Gemini embeds the query (with the
 * server-only GEMINI_API_KEY) and every exercise is ranked by cosine similarity
 * against its precomputed vector. The app blends this with its offline search and
 * silently does without it when offline, on error, or when no key is configured.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_QUERY = 160;
const CACHE_SIZE = 500;
const TIMEOUT_MS = 4000;

let vectors: Float32Array | null = null;
function exerciseVectors() {
  if (vectors) return vectors;
  const bin = Buffer.from(VEC_DATA, "base64");
  vectors = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) vectors[i] = bin.readInt8(i) / VEC_SCALE;
  return vectors;
}

/** Small LRU of query → ranked results (Map keeps insertion order). */
const cache = new Map<string, { slug: string; score: number }[]>();

async function embedQuery(text: string, key: string): Promise<Float32Array> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ content: { parts: [{ text }] }, taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIMS }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const v = json.embedding?.values;
  if (!v || v.length !== EMBED_DIMS) throw new Error("Unexpected embedding");
  const n = Math.hypot(...v) || 1;
  return Float32Array.from(v, (x) => x / n);
}

export async function GET(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !VEC_SLUGS.length) return Response.json({ error: "Semantic search is not configured" }, { status: 503 });
  const q = normalize(req.nextUrl.searchParams.get("q") ?? "").slice(0, MAX_QUERY);
  if (q.length < 2) return Response.json({ error: "Query too short" }, { status: 400 });

  let results = cache.get(q);
  if (results) {
    cache.delete(q);
    cache.set(q, results);
  } else {
    let qv: Float32Array;
    try {
      qv = await embedQuery(q, key);
    } catch {
      return Response.json({ error: "Semantic search is unavailable" }, { status: 502 });
    }
    const ev = exerciseVectors();
    results = VEC_SLUGS.map((slug, i) => {
      let s = 0;
      for (let j = 0; j < EMBED_DIMS; j++) s += qv[j] * ev[i * EMBED_DIMS + j];
      return { slug, score: Math.round(s * 10000) / 10000 };
    }).sort((a, b) => b.score - a.score);
    cache.set(q, results);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  }
  return Response.json(
    { model: EMBED_MODEL, query: q, results },
    // Same query, same answer: let the CDN keep it for a day.
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
