import { MUSCLE_IDS, type MuscleId } from "../../muscles";

/** Index of each muscle id in the vertex attribute / highlight uniform. */
export const MUSCLE_INDEX = Object.fromEntries(MUSCLE_IDS.map((m, i) => [m, i])) as Record<MuscleId, number>;

export const MUSCLE_INDEX_GLUTES = MUSCLE_INDEX.glutes;

export const muscleAt = (i: number): MuscleId | null => MUSCLE_IDS[i] ?? null;
