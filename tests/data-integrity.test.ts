/**
 * Content checks for the exercise library, programs, muscles and the
 * equipment catalogue. Every test collects all problems for one item and
 * fails once with the full list, so a content author sees everything to fix
 * in a single run.
 */
import { describe, expect, it } from "vitest";
import { EXERCISES, getExercise } from "@/data/exercises";
import { EQUIPMENT, categorySlug, getEquipment, parseCategory } from "@/data/equipment";
import { PROGRAMS } from "@/data/programs";
import type { Pose, Prop } from "@/lib/anatomy/types";
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORIES,
  equipmentForExercise,
  exercisesForEquipment,
  isEquipmentSlug,
} from "@/lib/equipment-catalog";
import type { Equipment, Exercise, ExerciseCategory, Level } from "@/lib/exercise-types";
import { isMuscleId, MUSCLE_IDS, MUSCLES, REGIONS } from "@/lib/muscles";
import { expectNoProblems } from "./support/problems";

/*
 * Runtime copies of the string-union types. `Record<Union, true>` makes
 * `npm run typecheck` fail if a value is added to (or removed from) a union
 * without updating these lists.
 */
const EQUIPMENT_VALUES: Record<Equipment, true> = {
  Barbell: true,
  Dumbbell: true,
  Bodyweight: true,
  Kettlebell: true,
  Cable: true,
  "Pull-up bar": true,
  Bench: true,
  Machine: true,
  "EZ bar": true,
  "Trap bar": true,
  "Dip bars": true,
  "Plyo box": true,
  "Medicine ball": true,
  "Resistance band": true,
  "Ab wheel": true,
  "Battle ropes": true,
  Landmine: true,
  "Jump rope": true,
};
const LEVELS: Record<Level, true> = { Beginner: true, Intermediate: true, Advanced: true };
const CATEGORIES: Record<ExerciseCategory, true> = { Strength: true, Cardio: true, Plyometric: true, Mobility: true };
const MECHANICS: Record<Exercise["mechanics"], true> = { Compound: true, Isolation: true };

/** Lower-case words separated by single hyphens: safe in a URL path without encoding. */
const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const has = <T extends string>(set: Record<T, true>, v: unknown): v is T => typeof v === "string" && Object.hasOwn(set, v);
const blank = (s: unknown) => typeof s !== "string" || s.trim() === "";
const dupes = <T>(xs: readonly T[]) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];

const bySlug = <T extends { slug: string }>(items: readonly T[]) => items.map((i) => [i.slug, i] as const);

describe("exercise library", () => {
  it("has exercises", () => {
    expect(EXERCISES.length).toBeGreaterThan(0);
  });

  it("slugs are unique", () => {
    expect(dupes(EXERCISES.map((e) => e.slug)), "duplicate exercise slugs").toEqual([]);
  });

  it("names are unique", () => {
    expect(dupes(EXERCISES.map((e) => e.name.trim().toLowerCase())), "duplicate exercise names").toEqual([]);
  });

  describe.each(bySlug(EXERCISES))("%s", (slug, e) => {
    it("has a URL-safe slug", () => {
      expect(slug, "slug must be lower-case-hyphenated").toMatch(URL_SAFE);
    });

    it("has complete written content", () => {
      const problems: string[] = [];
      if (blank(e.name)) problems.push("name is empty");
      if (blank(e.summary)) problems.push("summary is empty");
      if (!Array.isArray(e.steps) || e.steps.length < 3) problems.push(`needs at least 3 steps (has ${e.steps?.length ?? 0})`);
      if (!Array.isArray(e.tips) || e.tips.length < 1) problems.push("needs at least 1 tip");
      if (!Array.isArray(e.mistakes) || e.mistakes.length < 1) problems.push("needs at least 1 common mistake");
      for (const key of ["steps", "tips", "mistakes"] as const) {
        (e[key] ?? []).forEach((s, i) => blank(s) && problems.push(`${key}[${i}] is empty`));
        dupes(e[key] ?? []).forEach((s) => problems.push(`${key} repeats "${s}"`));
      }
      if (blank(e.breathing)) problems.push("breathing is empty");
      for (const key of ["sets", "reps", "rest"] as const) {
        if (blank(e.prescription?.[key])) problems.push(`prescription.${key} is empty`);
      }
      expectNoProblems(problems, slug);
    });

    it("uses valid classification values", () => {
      const problems: string[] = [];
      if (!REGIONS.includes(e.region)) problems.push(`region "${e.region}" is not one of ${REGIONS.join(", ")}`);
      if (!has(LEVELS, e.level)) problems.push(`level "${e.level}" is not valid`);
      if (!has(MECHANICS, e.mechanics)) problems.push(`mechanics "${e.mechanics}" is not valid`);
      if (e.category !== undefined && !has(CATEGORIES, e.category)) problems.push(`category "${e.category}" is not valid`);
      expectNoProblems(problems, slug);
    });

    it("targets valid muscles (primary non-empty, no overlap with secondary)", () => {
      const problems: string[] = [];
      if (!e.primary?.length) problems.push("primary muscles are empty");
      for (const key of ["primary", "secondary"] as const) {
        (e[key] ?? []).forEach((m) => !isMuscleId(m) && problems.push(`${key} has unknown muscle "${m}" (valid: ${MUSCLE_IDS.join(", ")})`));
        dupes(e[key] ?? []).forEach((m) => problems.push(`${key} lists "${m}" twice`));
      }
      (e.primary ?? []).filter((m) => e.secondary?.includes(m)).forEach((m) => problems.push(`"${m}" is both primary and secondary`));
      expectNoProblems(problems, slug);
    });

    it("lists valid equipment and gear", () => {
      const problems: string[] = [];
      if (!e.equipment?.length) problems.push("equipment is empty (use \"Bodyweight\" for none)");
      e.equipment?.forEach((q) => !has(EQUIPMENT_VALUES, q) && problems.push(`equipment "${q}" is not in the Equipment union`));
      dupes(e.equipment ?? []).forEach((q) => problems.push(`equipment lists "${q}" twice`));
      (e.gear ?? []).forEach((g) => !isEquipmentSlug(g) && problems.push(`gear "${g}" is not a catalogue slug (src/lib/equipment-catalog.ts)`));
      dupes(e.gear ?? []).forEach((g) => problems.push(`gear lists "${g}" twice`));
      expectNoProblems(problems, slug);
    });

    it("has a playable animation", () => {
      const problems: string[] = [];
      const frames = e.animation?.frames ?? [];
      if (frames.length < 2) problems.push(`needs at least 2 keyframes (has ${frames.length})`);
      if (!frames.some((f) => f.rep) && !e.hold) problems.push("no keyframe has `rep: true` (and the exercise is not `hold: true`), so the rep counter never counts");
      frames.forEach((f, i) => {
        if (f.dur !== undefined && !(Number.isFinite(f.dur) && f.dur > 0)) problems.push(`frame ${i}: dur must be > 0 (is ${f.dur})`);
        if (f.hold !== undefined && !(Number.isFinite(f.hold) && f.hold >= 0)) problems.push(`frame ${i}: hold must be ≥ 0 (is ${f.hold})`);
        problems.push(...poseShapeProblems(f.pose).map((p) => `frame ${i}: ${p}`));
      });
      (e.animation?.props ?? []).forEach((p, i) => problems.push(...propProblems(p).map((m) => `props[${i}]: ${m}`)));
      expectNoProblems(problems, slug);
    });
  });
});

/** Structural checks on a pose that TypeScript cannot enforce (finite numbers, limb counts). */
function poseShapeProblems(pose: Pose): string[] {
  const problems: string[] = [];
  if (!pose) return ["pose is missing"];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "number" && !Number.isFinite(v)) problems.push(`${path} is ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(pose, "pose");
  for (const key of ["arms", "legs"] as const) {
    const n = pose[key]?.length ?? 0;
    if (n < 1 || n > 2) problems.push(`pose.${key} must have 1 or 2 limbs (has ${n})`);
    pose[key]?.forEach((l, i) => {
      if (!("ik" in l) && !("angles" in l)) problems.push(`pose.${key}[${i}] needs either \`ik\` + \`pole\` or \`angles\``);
      if ("ik" in l && !Array.isArray(l.pole)) problems.push(`pose.${key}[${i}] is IK but has no pole`);
      if ("ik" in l && Array.isArray(l.pole) && l.pole.every((c) => c === 0)) problems.push(`pose.${key}[${i}] pole is all zeros`);
    });
  }
  return problems;
}

function propProblems(p: Prop): string[] {
  switch (p.type) {
    case "equipment":
      return isEquipmentSlug(p.slug) ? [] : [`equipment prop slug "${p.slug}" is not a catalogue slug`];
    case "bench":
    case "box":
      return p.from < p.to ? [] : [`${p.type} from (${p.from}) must be less than to (${p.to})`];
    default:
      return [];
  }
}

describe("extra props", () => {
  it("every `extra` prop kind used by an exercise is registered in src/lib/three/extra-props", async () => {
    const used = EXERCISES.flatMap((e) =>
      (e.animation.props ?? []).flatMap((p) => (p.type === "extra" ? [{ slug: e.slug, kind: p.kind }] : [])),
    );
    if (used.length === 0) return;
    const [{ LOWER_PROPS }, { UPPER_PROPS }, { CORE_PROPS }, { MACHINE_PROPS }] = await Promise.all([
      import("@/lib/three/extra-props/lower"),
      import("@/lib/three/extra-props/upper"),
      import("@/lib/three/extra-props/core"),
      import("@/lib/three/extra-props/machines"),
    ]);
    const registry = { ...LOWER_PROPS, ...UPPER_PROPS, ...CORE_PROPS, ...MACHINE_PROPS };
    const missing = used.filter((u) => !(u.kind in registry)).map((u) => `${u.slug}: extra prop kind "${u.kind}" is not registered`);
    expectNoProblems(missing, "extra props");
  });
});

describe("muscles", () => {
  it.each(MUSCLE_IDS.map((id) => [id] as const))("%s is complete and URL-safe", (id) => {
    const m = MUSCLES[id];
    const problems: string[] = [];
    if (!URL_SAFE.test(id)) problems.push(`id "${id}" is not URL-safe`);
    if (m.id !== id) problems.push(`MUSCLES["${id}"].id is "${m.id}"`);
    if (!REGIONS.includes(m.region)) problems.push(`region "${m.region}" is not valid`);
    if (m.view !== "front" && m.view !== "back") problems.push(`view "${m.view}" is not front/back`);
    for (const key of ["name", "latin", "function"] as const) if (blank(m[key])) problems.push(`${key} is empty`);
    expectNoProblems(problems, `muscle ${id}`);
  });

  it("MUSCLES has exactly the MUSCLE_IDS", () => {
    expect(Object.keys(MUSCLES).sort()).toEqual([...MUSCLE_IDS].sort());
  });

  it("every muscle is trained by at least one exercise (warning only)", () => {
    const untrained = MUSCLE_IDS.filter((id) => !EXERCISES.some((e) => e.primary.includes(id) || e.secondary.includes(id)));
    if (untrained.length) console.warn(`[warning] muscles with no exercises (empty muscle pages): ${untrained.join(", ")}`);
  });
});

describe("programs", () => {
  it("slugs are unique", () => {
    expect(dupes(PROGRAMS.map((p) => p.slug))).toEqual([]);
  });

  describe.each(bySlug(PROGRAMS))("%s", (slug, p) => {
    it("is complete and references existing exercises", () => {
      const problems: string[] = [];
      if (!URL_SAFE.test(slug)) problems.push(`slug "${slug}" is not URL-safe`);
      for (const key of ["name", "tagline", "description", "equipment"] as const) if (blank(p[key])) problems.push(`${key} is empty`);
      if (!has(LEVELS, p.level)) problems.push(`level "${p.level}" is not valid`);
      if (!(Number.isInteger(p.daysPerWeek) && p.daysPerWeek > 0)) problems.push(`daysPerWeek must be a positive integer (is ${p.daysPerWeek})`);
      if (!p.days.length) problems.push("has no days");
      p.days.forEach((d, di) => {
        const where = `days[${di}] "${d.title}"`;
        if (blank(d.title)) problems.push(`days[${di}] title is empty`);
        if (blank(d.focus)) problems.push(`${where} focus is empty`);
        if (!d.exercises.length) problems.push(`${where} has no exercises`);
        d.exercises.forEach((x, xi) => {
          const w = `${where} exercises[${xi}] "${x.slug}"`;
          const ex = getExercise(x.slug);
          if (!ex) problems.push(`${w}: no exercise with this slug`);
          if (!(Number.isInteger(x.sets) && x.sets > 0)) problems.push(`${w}: sets must be a positive integer (is ${x.sets})`);
          if (!(Number.isFinite(x.rest) && x.rest > 0)) problems.push(`${w}: rest must be > 0 seconds (is ${x.rest})`);
          if (blank(x.reps)) problems.push(`${w}: reps is empty`);
          // The workout player appends " reps" to values ending in a digit.
          if (ex?.hold && /\d$/.test(x.reps.trim())) problems.push(`${w}: timed hold but reps "${x.reps}" will read as "${x.reps} reps" — use e.g. "30 s"`);
        });
      });
      expectNoProblems(problems, slug);
    });
  });
});

describe("equipment catalogue", () => {
  it("slugs are unique and URL-safe", () => {
    const slugs = EQUIPMENT_CATALOG.map((e) => e.slug);
    expect(dupes(slugs)).toEqual([]);
    expect(slugs.filter((s) => !URL_SAFE.test(s)), "slugs that are not URL-safe").toEqual([]);
  });

  describe.each(bySlug(EQUIPMENT_CATALOG))("%s", (slug, entry) => {
    it("has valid parts, category and exercises", () => {
      const problems: string[] = [];
      if (blank(entry.name)) problems.push("name is empty");
      if (!EQUIPMENT_CATEGORIES.includes(entry.category)) problems.push(`category "${entry.category}" is not in EQUIPMENT_CATEGORIES`);
      if (!entry.parts.length) problems.push("has no parts");
      const ids: string[] = entry.parts.map((p) => p.id);
      dupes(ids).forEach((id) => problems.push(`part id "${id}" is used twice`));
      entry.parts.forEach((p) => {
        if (!URL_SAFE.test(p.id)) problems.push(`part id "${p.id}" is not lower-case-hyphenated`);
        if (blank(p.label)) problems.push(`part "${p.id}" has no label`);
      });
      const exercises: readonly string[] = entry.exercises;
      exercises.forEach((x) => !getExercise(x) && problems.push(`exercises lists "${x}", which is not in the library`));
      dupes(exercises).forEach((x) => problems.push(`exercises lists "${x}" twice`));
      expectNoProblems(problems, slug);
    });
  });

  it("every category has a URL-safe slug that parses back", () => {
    for (const c of EQUIPMENT_CATEGORIES) {
      expect(categorySlug(c), c).toMatch(URL_SAFE);
      expect(parseCategory(categorySlug(c)), c).toBe(c);
      expect(parseCategory(c.toUpperCase()), c).toBe(c);
    }
    expect(parseCategory("not-a-category")).toBeUndefined();
    expect(parseCategory("")).toBeUndefined();
  });

  it("an exercise's `gear` and the equipment page agree (exercise page links ↔ equipment page lists)", () => {
    const problems: string[] = [];
    for (const e of EXERCISES) {
      for (const g of e.gear ?? []) {
        const info = getEquipment(g);
        if (info && !info.exercises.includes(e.slug)) {
          problems.push(
            `${e.slug}: declares gear "${g}" (the exercise page links to /equipment/${g}), but /equipment/${g} and /api/equipment/${g} don't list it — ` +
              `list it in EQUIPMENT_CATALOG["${g}"].exercises or build EQUIPMENT[].exercises from exercisesForEquipment()`,
          );
        }
      }
    }
    for (const entry of EQUIPMENT_CATALOG) {
      for (const x of exercisesForEquipment(entry.slug)) {
        if (!equipmentForExercise(x).some((q) => q.slug === entry.slug)) problems.push(`${x}: not linked back to ${entry.slug}`);
      }
    }
    expectNoProblems(problems, "gear ↔ equipment links");
  });
});

describe("equipment content (src/data/equipment.ts)", () => {
  it("covers every catalogue entry, in catalogue order", () => {
    expect(EQUIPMENT.map((e) => e.slug)).toEqual(EQUIPMENT_CATALOG.map((e) => e.slug));
  });

  describe.each(bySlug(EQUIPMENT))("%s", (slug, e) => {
    it("describes every part and has complete guide content", () => {
      const problems: string[] = [];
      const entry = EQUIPMENT_CATALOG.find((c) => c.slug === slug);
      if (!entry) problems.push("not in EQUIPMENT_CATALOG");
      entry?.parts.forEach((p) => {
        const part = e.parts.find((x) => x.id === p.id);
        if (!part || blank(part.description)) problems.push(`part "${p.id}" (${p.label}) has no description in CONTENT["${slug}"].parts`);
      });
      for (const key of ["summary", "description", "beginnerTip"] as const) if (blank(e[key])) problems.push(`${key} is empty`);
      if (!e.howToUse?.setup?.length) problems.push("howToUse.setup is empty");
      if (!e.howToUse?.use?.length) problems.push("howToUse.use is empty");
      if (!e.safety?.length) problems.push("safety is empty");
      if (!e.commonMistakes?.length) problems.push("commonMistakes is empty");
      for (const key of ["safety", "commonMistakes"] as const) (e[key] ?? []).forEach((s, i) => blank(s) && problems.push(`${key}[${i}] is empty`));
      (["setup", "use"] as const).forEach((k) => (e.howToUse?.[k] ?? []).forEach((s, i) => blank(s) && problems.push(`howToUse.${k}[${i}] is empty`)));
      if (!e.musclesTrained?.length) problems.push("musclesTrained is empty");
      (e.musclesTrained ?? []).forEach((m) => !isMuscleId(m) && problems.push(`musclesTrained has unknown muscle "${m}"`));
      dupes(e.musclesTrained ?? []).forEach((m) => problems.push(`musclesTrained lists "${m}" twice`));
      (e.specs ?? []).forEach((s, i) => (blank(s.label) || blank(s.value)) && problems.push(`specs[${i}] has an empty label or value`));
      if (!URL_SAFE.test(e.categorySlug)) problems.push(`categorySlug "${e.categorySlug}" is not URL-safe`);
      if (e.exercises.length === 0 && blank(e.starterWorkout)) {
        problems.push("has no library exercises and no starterWorkout — the page would have nothing to do with it");
      }
      e.exercises.forEach((x) => !getExercise(x) && problems.push(`exercises lists "${x}", which is not in the library`));
      expectNoProblems(problems, slug);
    });
  });
});
