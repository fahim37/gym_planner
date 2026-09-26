/**
 * Smart exercise search: typos, gym slang, phrases, ranking, filters and the
 * semantic (vector) blending, offline and online.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getExercise } from "@/data/exercises";
import { findExercises } from "@/lib/queries";
import { relatedTo, searchExercises, semanticKeys } from "@/lib/search/engine";
import { offlineSemantic } from "@/lib/search/semantic";
import { SEM_TERMS } from "@/lib/search/semantic-data";
import { editDistance, stem } from "@/lib/search/text";

const names = (q: string, n = 5) =>
  searchExercises(q)
    .hits.slice(0, n)
    .map((h) => h.exercise.name);
const top = (q: string) => names(q, 1)[0];
const exercises = (q: string, n = 5) => searchExercises(q).hits.slice(0, n).map((h) => h.exercise);

describe("text helpers", () => {
  it("stems plurals and -ing forms to the same word", () => {
    expect(stem("curls")).toBe(stem("curl"));
    expect(stem("pressing")).toBe(stem("press"));
    expect(stem("lunges")).toBe(stem("lunge"));
    expect(stem("flies")).toBe(stem("fly"));
    expect(stem("squatting")).toBe(stem("squat"));
  });
  it("counts typos, including swapped letters, and gives up early", () => {
    expect(editDistance("bench", "benhc")).toBe(1);
    expect(editDistance("squat", "sqaut")).toBe(1);
    expect(editDistance("deadlift", "dedlift")).toBe(1);
    expect(editDistance("curl", "press", 2)).toBe(3);
  });
});

describe("typo tolerance", () => {
  it.each([
    ["benhc press", /Bench Press/],
    ["sqaut", /Squat/],
    ["dedlift", /Deadlift/],
    ["dumbel curl", /Dumbbell .*Curl/],
    ["latteral raise", /Lateral Raise/],
    ["tricpes pushdown", /Triceps Pushdown/],
    ["kettelbell swing", /Kettlebell Swing/],
  ])("%s → %s", (q, re) => {
    expect(top(q)).toMatch(re);
  });

  it("suggests the corrected spelling", () => {
    expect(searchExercises("benhc press").didYouMean).toBe("bench press");
    expect(searchExercises("bench press").didYouMean).toBeUndefined();
  });

  it("finds matches while a word is still being typed", () => {
    expect(names("squ", 5).every((n) => /Squat/.test(n))).toBe(true);
    expect(top("face pu")).toBe("Cable Face Pull");
  });
});

describe("gym slang and abbreviations", () => {
  it.each([
    ["ohp", "Barbell Overhead Press"],
    ["rdl", "Barbell Romanian Deadlift"],
    ["bss", "Bulgarian Split Squat"],
    ["skull crushers", "EZ-Bar Skull Crusher"],
    ["pullups", "Pull-Up"],
    ["press ups", "Push-Up"],
    ["kb swing", "Kettlebell Swing"],
    ["farmers carry", "Farmer's Walk"],
  ])("%s → %s", (q, name) => {
    expect(top(q)).toBe(name);
  });

  it.each([
    ["pecs", "chest"],
    ["hammies", "hamstrings"],
    ["booty", "glutes"],
    ["six pack", "abs"],
    ["love handles", "obliques"],
    ["bis", "biceps"],
    ["tris", "triceps"],
    ["calfs", "calves"],
  ] as const)("%s → exercises that train the %s", (q, muscle) => {
    for (const e of exercises(q, 5)) expect([...e.primary, ...e.secondary]).toContain(muscle);
  });

  it("maps equipment shorthand and goals", () => {
    for (const e of exercises("db row", 3)) expect(e.equipment).toContain("Dumbbell");
    for (const e of exercises("no equipment", 10)) expect(e.equipment).toContain("Bodyweight");
    for (const e of exercises("leg day", 10)) expect(e.region).toBe("Legs");
    for (const e of exercises("cardio", 6)) expect(e.category).toBe("Cardio");
  });
});

describe("ranking", () => {
  it("puts the exact exercise first", () => {
    expect(top("push up")).toBe("Push-Up");
    expect(top("glute bridge")).toBe("Glute Bridge");
    expect(top("leg press")).toBe("Leg Press");
    expect(top("chest")).not.toMatch(/Supported/);
  });

  it("keeps two-word names together but still finds split words", () => {
    expect(names("calf raise", 3).every((n) => /Calf Raise/.test(n))).toBe(true);
    expect(names("dumbbell curl", 6).every((n) => /Curl/.test(n))).toBe(true);
    expect(names("lower back", 5).length).toBe(5);
    for (const e of exercises("lower back", 5)) expect([...e.primary, ...e.secondary]).toContain("lower-back");
  });

  it("follows few exact matches with close ones, marked as partial", () => {
    const r = searchExercises("cable fly").hits;
    expect(r[0].exercise.name).toBe("Cable Crossover");
    expect(r[0].full).toBe(true);
    expect(r.slice(1, 4).every((h) => !h.full && /Fly/.test(h.exercise.name))).toBe(true);
  });

  it("is fast", () => {
    searchExercises("warm up");
    const t = performance.now();
    for (const q of ["bench", "dumbel curl", "leg day", "lower back pain", "explosive legs no equipment"]) searchExercises(q);
    expect(performance.now() - t).toBeLessThan(150);
  });
});

describe("filters", () => {
  it("applies filters to ranked results", () => {
    const r = findExercises({ q: "curl", equipment: "Cable" });
    expect(r.length).toBeGreaterThan(0);
    for (const e of r) expect(e.equipment).toContain("Cable");
  });
  it("returns everything in catalogue order for an empty query", () => {
    expect(searchExercises("").hits.length).toBe(findExercises().length);
  });
});

describe("semantic blending", () => {
  it("re-ranks with semantic scores and adds related exercises", () => {
    const plain = searchExercises("curl").hits.map((h) => h.exercise.slug);
    const last = plain[plain.length - 1];
    const boosted = searchExercises("curl", { semantic: new Map([[last, 1]]), semanticWeight: 2 }).hits;
    expect(boosted[0].exercise.slug).toBe(last);
    const extra = searchExercises("curl", { semantic: new Map([["barbell-back-squat", 1]]) }).hits;
    const squat = extra.find((h) => h.exercise.slug === "barbell-back-squat");
    expect(squat?.related).toBe(true);
    expect(extra.indexOf(squat!)).toBeGreaterThanOrEqual(plain.length);
  });

  it("adds close relatives of a named exercise (offline feature vectors)", () => {
    const r = searchExercises("glute bridge").hits;
    expect(r.slice(0, 2).every((h) => h.full)).toBe(true);
    expect(r.some((h) => h.related && h.exercise.slug === "barbell-hip-thrust")).toBe(true);
    const fly = [...relatedTo([["cable-crossover", 1]])].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    expect(fly.slice(1, 3).sort()).toEqual(["dumbbell-fly", "pec-deck-fly"]);
    expect(searchExercises("leg press").hits.slice(1, 6).some((h) => h.exercise.slug === "hack-squat")).toBe(true);
  });

  it.skipIf(!SEM_TERMS.length)("offline vocabulary understands goals without a key", () => {
    const top = (q: string) =>
      [...(offlineSemantic(semanticKeys(q)) ?? new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([s]) => getExercise(s)!);
    expect(top("explosive").some((e) => e.category === "Plyometric" || /Clean|Jump|Swing/.test(e.name))).toBe(true);
    expect(top("lower back pain").some((e) => [...e.primary, ...e.secondary].includes("lower-back"))).toBe(true);
    expect(top("stretching").some((e) => e.category === "Mobility")).toBe(true);
    expect(offlineSemantic(semanticKeys("zzzz qqqq"))).toBeUndefined();
  });
});

vi.mock("@/lib/search/exercise-vectors", async () => {
  const { EMBED_DIMS } = await import("@/lib/search/embed-config");
  const bin = Buffer.alloc(3 * EMBED_DIMS);
  [0, 1, 2].forEach((i) => bin.writeInt8(127, i * EMBED_DIMS + i));
  return { VEC_SLUGS: ["barbell-back-squat", "push-up", "crunch"], VEC_SCALE: 127, VEC_DATA: bin.toString("base64") };
});

describe("/api/search", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const call = async (q: string) => {
    const { GET } = await import("@/app/api/search/route");
    const { NextRequest } = await import("next/server");
    return GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`));
  };

  it("answers 503 without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await call("chest")).status).toBe(503);
  });

  it("embeds the query with Gemini and ranks every exercise", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { EMBED_DIMS } = await import("@/lib/search/embed-config");
    // Pretend the query means exactly the push-up (fake vectors: one axis per exercise).
    const values = Array.from({ length: EMBED_DIMS }, (_, j) => (j === 1 ? 1 : 0));
    const fetchMock = vi.fn(async () => Response.json({ embedding: { values } }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await call("chest exercise at home without weights");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: { slug: string; score: number }[] };
    expect(json.results[0].slug).toBe("push-up");
    expect(json.results.length).toBe(3);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    // Cached: a repeat doesn't call Gemini again.
    await call("chest exercise at home without weights");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers 502 when Gemini fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect((await call("something new entirely")).status).toBe(502);
  });
});
