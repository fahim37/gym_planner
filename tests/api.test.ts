/**
 * Calls the App Router route handlers directly (no server needed).
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getEquipmentBySlug } from "@/app/api/equipment/[slug]/route";
import { GET as listEquipment } from "@/app/api/equipment/route";
import { GET as getExerciseBySlug } from "@/app/api/exercises/[slug]/route";
import { GET as listExercises } from "@/app/api/exercises/route";
import { GET as listMuscles } from "@/app/api/muscles/route";
import { GET as getProgramBySlug } from "@/app/api/programs/[slug]/route";
import { GET as listPrograms } from "@/app/api/programs/route";
import { EQUIPMENT } from "@/data/equipment";
import { EXERCISES } from "@/data/exercises";
import { PROGRAMS } from "@/data/programs";
import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORIES } from "@/lib/equipment-catalog";
import { MUSCLE_IDS } from "@/lib/muscles";

const BASE = "http://localhost:3000";
const req = (path: string) => new NextRequest(new URL(path, BASE));
/** Route context as Next passes it: params is a promise. */
const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

async function json<T = unknown>(res: Response | Promise<Response>): Promise<{ status: number; body: T; type: string | null }> {
  const r = await res;
  return { status: r.status, body: (await r.json()) as T, type: r.headers.get("content-type") };
}

interface ExerciseList {
  count: number;
  exercises: Array<Record<string, unknown> & { slug: string; region: string; level: string; equipment: string[]; primary: string[]; secondary: string[] }>;
}

describe("GET /api/exercises", () => {
  const list = (query = "") => json<ExerciseList>(listExercises(req(`/api/exercises${query}`)));

  it("lists every exercise as JSON, without animation or long-form content", async () => {
    const { status, body, type } = await list();
    expect(status).toBe(200);
    expect(type).toMatch(/application\/json/);
    expect(body.count).toBe(EXERCISES.length);
    expect(body.exercises.map((e) => e.slug)).toEqual(EXERCISES.map((e) => e.slug));
    for (const e of body.exercises) {
      for (const key of ["animation", "steps", "tips", "mistakes"]) expect(e, `${e.slug}.${key}`).not.toHaveProperty(key);
      for (const key of ["name", "summary", "primary", "equipment", "level", "region"]) expect(e, `${e.slug}.${key}`).toHaveProperty(key);
    }
  });

  it("filters by region", async () => {
    const { status, body } = await list("?region=Legs");
    expect(status).toBe(200);
    expect(body.count).toBe(EXERCISES.filter((e) => e.region === "Legs").length);
    expect(body.count).toBeGreaterThan(0);
    expect(body.exercises.every((e) => e.region === "Legs")).toBe(true);
  });

  it.each(MUSCLE_IDS.map((m) => [m]))("filters by muscle=%s (primary or secondary)", async (m) => {
    const { status, body } = await list(`?muscle=${m}`);
    expect(status).toBe(200);
    expect(body.count).toBe(EXERCISES.filter((e) => e.primary.includes(m) || e.secondary.includes(m)).length);
    expect(body.exercises.every((e) => e.primary.includes(m) || e.secondary.includes(m))).toBe(true);
  });

  it("filters by equipment and level", async () => {
    const eq = await list("?equipment=Dumbbell");
    expect(eq.status).toBe(200);
    expect(eq.body.count).toBe(EXERCISES.filter((e) => e.equipment.includes("Dumbbell")).length);
    expect(eq.body.exercises.every((e) => e.equipment.includes("Dumbbell"))).toBe(true);

    const lv = await list("?level=Beginner");
    expect(lv.status).toBe(200);
    expect(lv.body.count).toBe(EXERCISES.filter((e) => e.level === "Beginner").length);
    expect(lv.body.exercises.every((e) => e.level === "Beginner")).toBe(true);
  });

  it("combines filters (AND)", async () => {
    const { body } = await list("?region=Chest&level=Beginner&equipment=Bodyweight");
    const expected = EXERCISES.filter((e) => e.region === "Chest" && e.level === "Beginner" && e.equipment.includes("Bodyweight"));
    expect(body.exercises.map((e) => e.slug)).toEqual(expected.map((e) => e.slug));
  });

  it("searches names with q (case-insensitive, every word must match)", async () => {
    const { body } = await list("?q=SQUAT");
    expect(body.exercises.map((e) => e.slug)).toContain("barbell-back-squat");
    const none = await list("?q=squat%20zzzz-no-such-word");
    expect(none.body.count).toBe(0);
    const blank = await list("?q=%20%20");
    expect(blank.body.count).toBe(EXERCISES.length);
  });

  it("rejects an unknown muscle with 400", async () => {
    const { status, body } = await list("?muscle=wings");
    expect(status).toBe(400);
    expect(body).toHaveProperty("error");
  });

  it("rejects an unknown region with 400", async () => {
    const { status, body } = await list("?region=Feet");
    expect(status).toBe(400);
    expect(body).toHaveProperty("error");
    // Region names are case-sensitive.
    expect((await list("?region=legs")).status).toBe(400);
  });

  it("never returns unrelated exercises for an unknown equipment or level", async () => {
    // Today these return 200 with no results rather than 400 like muscle/region.
    for (const q of ["?equipment=Spaceship", "?level=Expert"]) {
      const { status, body } = await list(q);
      expect([200, 400], q).toContain(status);
      if (status === 200) expect(body.count, q).toBe(0);
    }
  });
});

describe("GET /api/exercises/:slug", () => {
  it.each(EXERCISES.map((e) => [e.slug]))("returns the full exercise %s", async (slug) => {
    const { status, body } = await json<{ slug: string; animation: { frames: unknown[] }; steps: string[] }>(
      getExerciseBySlug(req(`/api/exercises/${slug}`), ctx({ slug })),
    );
    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body.animation.frames.length).toBeGreaterThan(0);
    expect(body.steps.length).toBeGreaterThan(0);
  });

  it("returns 404 JSON for an unknown slug", async () => {
    const { status, body } = await json(getExerciseBySlug(req("/api/exercises/nope"), ctx({ slug: "nope" })));
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });
});

describe("GET /api/muscles", () => {
  it("lists every muscle with the exercises that train it", async () => {
    const { status, body } = await json<Array<{ id: string; primaryExercises: string[]; secondaryExercises: string[] }>>(listMuscles());
    expect(status).toBe(200);
    expect(body.map((m) => m.id)).toEqual([...MUSCLE_IDS]);
    const slugs = new Set(EXERCISES.map((e) => e.slug));
    for (const m of body) {
      for (const s of [...m.primaryExercises, ...m.secondaryExercises]) expect(slugs.has(s), `${m.id} → ${s}`).toBe(true);
      expect(m.primaryExercises.filter((s) => m.secondaryExercises.includes(s)), m.id).toEqual([]);
    }
  });
});

describe("GET /api/programs", () => {
  it("lists every program", async () => {
    const { status, body } = await json<Array<{ slug: string }>>(listPrograms());
    expect(status).toBe(200);
    expect(body.map((p) => p.slug)).toEqual(PROGRAMS.map((p) => p.slug));
  });

  it.each(PROGRAMS.map((p) => [p.slug]))("returns program %s", async (slug) => {
    const { status, body } = await json<{ slug: string; days: unknown[] }>(getProgramBySlug(req(`/api/programs/${slug}`), ctx({ slug })));
    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body.days.length).toBeGreaterThan(0);
  });

  it("returns 404 JSON for an unknown program", async () => {
    const { status, body } = await json(getProgramBySlug(req("/api/programs/nope"), ctx({ slug: "nope" })));
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });
});

describe("GET /api/equipment", () => {
  type EquipmentList = { count: number; equipment: Array<Record<string, unknown> & { slug: string; category: string }> };
  const list = (query = "") => json<EquipmentList>(listEquipment(req(`/api/equipment${query}`)));

  it("lists every catalogue entry as a summary", async () => {
    const { status, body } = await list();
    expect(status).toBe(200);
    expect(body.count).toBe(EQUIPMENT_CATALOG.length);
    expect(body.equipment.map((e) => e.slug)).toEqual(EQUIPMENT_CATALOG.map((e) => e.slug));
    for (const e of body.equipment) {
      for (const key of ["howToUse", "safety", "description"]) expect(e, `${e.slug}.${key}`).not.toHaveProperty(key);
      for (const key of ["name", "summary", "parts", "categorySlug"]) expect(e, `${e.slug}.${key}`).toHaveProperty(key);
    }
  });

  it.each(EQUIPMENT_CATEGORIES.map((c) => [c]))("filters by category name or slug: %s", async (category) => {
    const expected = EQUIPMENT.filter((e) => e.category === category).map((e) => e.slug);
    const byName = await list(`?category=${encodeURIComponent(category)}`);
    expect(byName.status).toBe(200);
    expect(byName.body.equipment.map((e) => e.slug)).toEqual(expected);
    const slug = EQUIPMENT.find((e) => e.category === category)?.categorySlug;
    if (slug) {
      const bySlug = await list(`?category=${slug}`);
      expect(bySlug.body.equipment.map((e) => e.slug)).toEqual(expected);
    }
  });

  it("rejects an unknown category with 400 and lists the valid ones", async () => {
    const { status, body } = await list("?category=spaceships");
    expect(status).toBe(400);
    expect(body).toMatchObject({ categories: EQUIPMENT_CATEGORIES });
  });
});

describe("GET /api/equipment/:slug", () => {
  it.each(EQUIPMENT_CATALOG.map((e) => [e.slug]))("returns the full guide for %s", async (slug) => {
    const { status, body } = await json<{ slug: string; parts: Array<{ id: string; description: string }>; howToUse: unknown }>(
      getEquipmentBySlug(req(`/api/equipment/${slug}`), ctx({ slug })),
    );
    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body).toHaveProperty("howToUse");
    expect(body.parts.length).toBeGreaterThan(0);
  });

  it("returns 404 JSON for unknown equipment", async () => {
    const { status, body } = await json(getEquipmentBySlug(req("/api/equipment/nope"), ctx({ slug: "nope" })));
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });
});

/*
 * Catches routes added later: every src/app/api/** /route.ts must answer GET
 * with JSON (static routes → 200, dynamic routes with a bogus param → 404).
 */
describe("every API route", () => {
  const apiDir = join(process.cwd(), "src", "app", "api");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : name === "route.ts" ? [p] : [];
    });
  const routes = walk(apiDir).map((file) => {
    const url = "/api/" + relative(apiDir, file).split(sep).slice(0, -1).join("/");
    return [url, file] as const;
  });

  it("finds the route files", () => {
    expect(routes.length).toBeGreaterThanOrEqual(7);
  });

  it.each(routes)("%s answers GET with JSON", async (url, file) => {
    const mod = (await import(pathToFileURL(file).href)) as { GET?: (...args: unknown[]) => Response | Promise<Response> };
    expect(typeof mod.GET, `${file} should export GET`).toBe("function");
    const dynamic = [...url.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    const params = Object.fromEntries(dynamic.map((k) => [k, "zzz-does-not-exist"]));
    const path = url.replace(/\[([^\]]+)\]/g, "zzz-does-not-exist");
    const res = await mod.GET!(req(path), ctx(params));
    expect(res.headers.get("content-type"), url).toMatch(/application\/json/);
    await res.json();
    // /api/search needs a query (400) and a server-side Gemini key (503 without one).
    const expected = url === "/api/search" ? [400, 503] : [dynamic.length ? 404 : 200];
    expect(expected, url).toContain(res.status);
  });
});
