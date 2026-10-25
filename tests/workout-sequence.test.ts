import { describe, expect, it } from "vitest";
import { PROGRAMS, getProgram, programProgressKey } from "@/data/programs";
import { buildWorkoutSequence } from "@/lib/workout-sequence";

describe("workout set order", () => {
  it("alternates all three Saturday arm rounds and rests after each pair", () => {
    const day = getProgram("my-gym-plan-v2")!.days[0];
    const sequence = buildWorkoutSequence(day.exercises);
    expect(sequence.filter((entry) => [4, 5].includes(entry.exerciseIndex))).toEqual([
      { exerciseIndex: 4, set: 1, restAfter: 0 },
      { exerciseIndex: 5, set: 1, restAfter: 60 },
      { exerciseIndex: 4, set: 2, restAfter: 0 },
      { exerciseIndex: 5, set: 2, restAfter: 60 },
      { exerciseIndex: 4, set: 3, restAfter: 0 },
      { exerciseIndex: 5, set: 3, restAfter: 60 },
    ]);
    expect(sequence[sequence.findIndex((entry) => entry.exerciseIndex === 5 && entry.set === 3) + 1])
      .toEqual({ exerciseIndex: 6, set: 1, restAfter: 60 });
  });

  it("includes every prescribed set exactly once in every program", () => {
    for (const program of PROGRAMS) for (const day of program.days) {
      const sequence = buildWorkoutSequence(day.exercises);
      expect(sequence).toHaveLength(day.exercises.reduce((sum, item) => sum + item.sets, 0));
      for (const [i, item] of day.exercises.entries()) {
        expect(sequence.filter((entry) => entry.exerciseIndex === i).map((entry) => entry.set))
          .toEqual(Array.from({ length: item.sets }, (_, set) => set + 1));
      }
    }
  });

  it("keeps ordinary straight sets together", () => {
    const sequence = buildWorkoutSequence(getProgram("my-gym-plan-v2")!.days[1].exercises);
    expect(sequence.slice(0, 5).map(({ exerciseIndex, set }) => [exerciseIndex, set]))
      .toEqual([[0, 1], [0, 2], [0, 3], [0, 4], [1, 1]]);
    expect(sequence.every((entry) => entry.restAfter > 0)).toBe(true);
  });

  it("handles superset members with different set counts", () => {
    const sequence = buildWorkoutSequence([
      { slug: "a", sets: 3, reps: "10", rest: 60, superset: "pair" },
      { slug: "b", sets: 2, reps: "12", rest: 90, superset: "pair" },
    ]);
    expect(sequence).toEqual([
      { exerciseIndex: 0, set: 1, restAfter: 0 }, { exerciseIndex: 1, set: 1, restAfter: 90 },
      { exerciseIndex: 0, set: 2, restAfter: 0 }, { exerciseIndex: 1, set: 2, restAfter: 90 },
      { exerciseIndex: 0, set: 3, restAfter: 60 },
    ]);
  });

  it("separates revised workout progress while preserving other programs", () => {
    const program = getProgram("my-gym-plan-v2")!;
    expect(programProgressKey(program)).toBe("my-gym-plan-v2:v2");
    for (const other of PROGRAMS.filter((p) => p.slug !== program.slug)) {
      expect(programProgressKey(other)).toBe(other.slug);
    }
  });
});
