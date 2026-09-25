import { EXERCISES } from "@/data/exercises";
import { PROGRAMS } from "@/data/programs";
import type { Equipment, Exercise, ExerciseSummary, Level } from "@/lib/exercise-types";
import { MUSCLES, type BodyRegion, type MuscleId } from "@/lib/muscles";

export interface ExerciseFilter {
  q?: string;
  region?: BodyRegion;
  muscle?: MuscleId;
  equipment?: Equipment;
  level?: Level;
}

export function summarize(e: Exercise): ExerciseSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { animation, steps, tips, mistakes, ...rest } = e;
  return rest;
}

export function findExercises(filter: ExerciseFilter = {}): Exercise[] {
  const q = filter.q?.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (filter.region && e.region !== filter.region) return false;
    if (filter.muscle && !e.primary.includes(filter.muscle) && !e.secondary.includes(filter.muscle)) return false;
    if (filter.equipment && !e.equipment.includes(filter.equipment)) return false;
    if (filter.level && e.level !== filter.level) return false;
    if (q) {
      const haystack = [e.name, e.summary, e.region, ...e.equipment, ...e.primary.map((m) => MUSCLES[m].name)]
        .join(" ")
        .toLowerCase();
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

/** Exercises for a muscle, strongest emphasis first. */
export function exercisesForMuscle(id: MuscleId) {
  const primary = EXERCISES.filter((e) => e.primary.includes(id));
  const secondary = EXERCISES.filter((e) => !e.primary.includes(id) && e.secondary.includes(id));
  return { primary, secondary };
}

/** Other exercises that share a primary muscle, most overlap first. */
export function relatedExercises(e: Exercise, limit = 4) {
  return EXERCISES.filter((o) => o.slug !== e.slug)
    .map((o) => ({ o, score: o.primary.filter((m) => e.primary.includes(m)).length * 2 + (o.region === e.region ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.o);
}

export function programsUsing(slug: string) {
  return PROGRAMS.filter((p) => p.days.some((d) => d.exercises.some((x) => x.slug === slug)));
}
