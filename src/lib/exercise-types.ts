import type { Animation } from "@/lib/anatomy/types";
import type { BodyRegion, MuscleId } from "@/lib/muscles";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Bodyweight"
  | "Kettlebell"
  | "Cable"
  | "Pull-up bar"
  | "Bench";

export type Level = "Beginner" | "Intermediate" | "Advanced";

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
  summary: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
  breathing: string;
  prescription: Prescription;
  /** Timed hold instead of reps (e.g. "30–60 s"). */
  hold?: boolean;
  animation: Animation;
}

/** Exercise without its animation, as served to list views and the API. */
export type ExerciseSummary = Omit<Exercise, "animation" | "steps" | "tips" | "mistakes">;
