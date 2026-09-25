/**
 * The gym equipment catalogue: the shared contract between the 3D models
 * (src/lib/three/equipment), the equipment content (src/data/equipment.ts)
 * and the pages. Slugs and part ids here must match the model hotspots.
 */

import { EXERCISES, getExercise } from "@/data/exercises";

export type EquipmentCategory = "Free weights" | "Benches & racks" | "Machines" | "Cardio" | "Accessories";

export interface EquipmentPartRef {
  /** Stable id; the 3D model exposes a hotspot with the same id. */
  id: string;
  label: string;
}

export interface EquipmentEntry {
  slug: string;
  name: string;
  category: EquipmentCategory;
  parts: EquipmentPartRef[];
  /** Exercises in the library that use this equipment. */
  exercises: string[];
}

const parts = (...p: [string, string][]): EquipmentPartRef[] => p.map(([id, label]) => ({ id, label }));

export const EQUIPMENT_CATALOG = [
  {
    slug: "barbell",
    name: "Olympic Barbell",
    category: "Free weights",
    parts: parts(["shaft", "Knurled shaft"], ["sleeve", "Rotating sleeve"], ["plate", "Weight plate"], ["collar", "Collar clip"]),
    exercises: [
      "barbell-back-squat",
      "barbell-romanian-deadlift",
      "bent-over-barbell-row",
      "conventional-deadlift",
      "barbell-bench-press",
      "barbell-overhead-press",
    ],
  },
  {
    slug: "dumbbells",
    name: "Dumbbells",
    category: "Free weights",
    parts: parts(["handle", "Knurled handle"], ["head", "Weight head"], ["rack", "Dumbbell rack"]),
    exercises: [
      "dumbbell-forward-lunge",
      "dumbbell-bulgarian-split-squat",
      "standing-dumbbell-calf-raise",
      "bent-over-dumbbell-row",
      "single-arm-dumbbell-row",
      "dumbbell-fly",
      "incline-dumbbell-press",
      "dumbbell-lateral-raise",
      "dumbbell-alternate-biceps-curl",
      "dumbbell-standing-triceps-extension",
    ],
  },
  {
    slug: "kettlebell",
    name: "Kettlebell",
    category: "Free weights",
    parts: parts(["handle", "Handle"], ["horns", "Horns"], ["bell", "Bell"]),
    exercises: ["kettlebell-swing"],
  },
  {
    slug: "ez-curl-bar",
    name: "EZ Curl Bar",
    category: "Free weights",
    parts: parts(["camber", "Angled grips"], ["sleeve", "Sleeve"], ["plate", "Weight plate"]),
    exercises: [],
  },
  {
    slug: "flat-bench",
    name: "Flat Bench",
    category: "Benches & racks",
    parts: parts(["pad", "Padded top"], ["frame", "Steel frame"], ["feet", "Stabiliser feet"]),
    exercises: ["barbell-bench-press", "dumbbell-fly", "dumbbell-bulgarian-split-squat", "single-arm-dumbbell-row"],
  },
  {
    slug: "adjustable-bench",
    name: "Adjustable Bench",
    category: "Benches & racks",
    parts: parts(["backrest", "Backrest"], ["seat", "Seat"], ["ladder", "Angle ladder"], ["wheels", "Transport wheels"]),
    exercises: ["incline-dumbbell-press"],
  },
  {
    slug: "power-rack",
    name: "Power Rack",
    category: "Benches & racks",
    parts: parts(
      ["uprights", "Uprights"],
      ["j-hooks", "J-hooks"],
      ["safety-arms", "Safety arms"],
      ["pull-up-bar", "Pull-up bar"],
      ["plate-storage", "Plate storage"],
    ),
    exercises: ["barbell-back-squat", "barbell-overhead-press", "barbell-bench-press", "pull-up", "hanging-leg-raise"],
  },
  {
    slug: "cable-machine",
    name: "Cable Crossover",
    category: "Machines",
    parts: parts(["weight-stack", "Weight stack"], ["pin", "Selector pin"], ["pulley", "Adjustable pulley"], ["handle", "Handle attachment"]),
    exercises: ["cable-face-pull", "cable-triceps-pushdown"],
  },
  {
    slug: "lat-pulldown",
    name: "Lat Pulldown Machine",
    category: "Machines",
    parts: parts(["bar", "Wide grip bar"], ["thigh-pad", "Thigh pad"], ["seat", "Seat"], ["weight-stack", "Weight stack"], ["pin", "Selector pin"]),
    exercises: ["lat-pulldown"],
  },
  {
    slug: "smith-machine",
    name: "Smith Machine",
    category: "Machines",
    parts: parts(["bar", "Guided bar"], ["hooks", "Rotating hooks"], ["rails", "Guide rails"], ["safety-stops", "Safety stops"]),
    exercises: [],
  },
  {
    slug: "leg-press",
    name: "Leg Press",
    category: "Machines",
    parts: parts(["sled", "Sled"], ["platform", "Foot platform"], ["seat", "Seat & backrest"], ["safety-handles", "Safety handles"], ["plate-horns", "Plate horns"]),
    exercises: [],
  },
  {
    slug: "leg-extension",
    name: "Leg Extension",
    category: "Machines",
    parts: parts(["seat", "Seat"], ["shin-pad", "Shin pad"], ["pivot", "Pivot point"], ["weight-stack", "Weight stack"]),
    exercises: [],
  },
  {
    slug: "treadmill",
    name: "Treadmill",
    category: "Cardio",
    parts: parts(["belt", "Running belt"], ["console", "Console"], ["safety-key", "Safety key"], ["handrails", "Handrails"]),
    exercises: [],
  },
  {
    slug: "rowing-machine",
    name: "Rowing Machine",
    category: "Cardio",
    parts: parts(["handle", "Handle"], ["seat", "Sliding seat"], ["footplates", "Footplates"], ["flywheel", "Flywheel"], ["rail", "Rail"]),
    exercises: [],
  },
  {
    slug: "exercise-bike",
    name: "Exercise Bike",
    category: "Cardio",
    parts: parts(["saddle", "Saddle"], ["handlebars", "Handlebars"], ["pedals", "Pedals"], ["resistance", "Resistance knob"], ["flywheel", "Flywheel"]),
    exercises: [],
  },
  {
    slug: "exercise-mat",
    name: "Exercise Mat",
    category: "Accessories",
    parts: parts(["mat", "Cushioned mat"]),
    exercises: ["glute-bridge", "push-up", "crunch", "forearm-plank", "mountain-climber"],
  },
] as const satisfies readonly EquipmentEntry[];

export type EquipmentSlug = (typeof EQUIPMENT_CATALOG)[number]["slug"];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ["Free weights", "Benches & racks", "Machines", "Cardio", "Accessories"];

export function getEquipmentEntry(slug: string): EquipmentEntry | undefined {
  return EQUIPMENT_CATALOG.find((e) => e.slug === slug);
}

export function isEquipmentSlug(slug: string): slug is EquipmentSlug {
  return EQUIPMENT_CATALOG.some((e) => e.slug === slug);
}

/** Equipment used by an exercise (catalogue lists plus the exercise's own `gear`), for "You'll need" links. */
export function equipmentForExercise(exerciseSlug: string): EquipmentEntry[] {
  const gear: readonly string[] = getExercise(exerciseSlug)?.gear ?? [];
  return EQUIPMENT_CATALOG.filter((e) => (e.exercises as readonly string[]).includes(exerciseSlug) || gear.includes(e.slug));
}

/** Exercise slugs that use a piece of equipment (catalogue list plus every exercise that declares it as `gear`). */
export function exercisesForEquipment(slug: string): string[] {
  const listed: readonly string[] = getEquipmentEntry(slug)?.exercises ?? [];
  const declared = EXERCISES.filter((e) => (e.gear as readonly string[] | undefined)?.includes(slug)).map((e) => e.slug);
  return [...new Set([...listed, ...declared])];
}
