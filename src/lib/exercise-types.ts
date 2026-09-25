import type { Animation } from "@/lib/anatomy/types";
import type { EquipmentSlug } from "@/lib/equipment-catalog";
import type { BodyRegion, MuscleId } from "@/lib/muscles";

export const EQUIPMENT_TYPES = [
  "Barbell",
  "Dumbbell",
  "Bodyweight",
  "Kettlebell",
  "Cable",
  "Pull-up bar",
  "Bench",
  "Machine",
  "EZ bar",
  "Trap bar",
  "Dip bars",
  "Plyo box",
  "Medicine ball",
  "Resistance band",
  "Ab wheel",
  "Battle ropes",
  "Landmine",
] as const;

export type Equipment = (typeof EQUIPMENT_TYPES)[number];

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type Level = (typeof LEVELS)[number];

/** Training style; strength is the default when omitted. */
export type ExerciseCategory = "Strength" | "Cardio" | "Plyometric" | "Mobility";

export interface Prescription {
  sets: string;
  reps: string;
  rest: string;
}

export interface Exercise {
  slug: string;
  name: string;
  region: BodyRegion;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: Equipment[];
  level: Level;
  mechanics: "Compound" | "Isolation";
  category?: ExerciseCategory;
  summary: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
  breathing: string;
  prescription: Prescription;
  /** Timed hold instead of reps (e.g. "30–60 s"). */
  hold?: boolean;
  /** Gym equipment (catalogue slugs) this exercise uses, shown as "You'll need" links. */
  gear?: EquipmentSlug[];
  animation: Animation;
}

/** Exercise without its animation, as served to list views and the API. */
export type ExerciseSummary = Omit<Exercise, "animation" | "steps" | "tips" | "mistakes">;
