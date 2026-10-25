import type { ProgramExercise } from "@/data/programs";

export interface WorkoutSet {
  exerciseIndex: number;
  set: number;
  restAfter: number;
}

/** Straight sets stay together; adjacent superset members alternate each round. */
export function buildWorkoutSequence(items: readonly ProgramExercise[]): WorkoutSet[] {
  const sequence: WorkoutSet[] = [];
  for (let start = 0; start < items.length;) {
    let end = start + 1;
    const group = items[start].superset;
    if (group) while (end < items.length && items[end].superset === group) end++;
    const rounds = Math.max(...items.slice(start, end).map((item) => item.sets));
    for (let set = 1; set <= rounds; set++) {
      const round: WorkoutSet[] = [];
      for (let exerciseIndex = start; exerciseIndex < end; exerciseIndex++) {
        const item = items[exerciseIndex];
        if (set <= item.sets) round.push({ exerciseIndex, set, restAfter: item.rest });
      }
      round.forEach((entry, i) => sequence.push({ ...entry, restAfter: i < round.length - 1 ? 0 : entry.restAfter }));
    }
    start = end;
  }
  return sequence;
}
