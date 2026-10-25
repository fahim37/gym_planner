import { describe, expect, it } from "vitest";
import { getProgram } from "@/data/programs";

const program = getProgram("my-gym-plan-v2")!;

describe("updated Gym Plan V2", () => {
  it("has four training days in the requested order and walking rest days", () => {
    expect(program.daysPerWeek).toBe(4);
    expect(program.days.map((day) => day.title)).toEqual([
      "Saturday — Upper A", "Sunday — Upper B", "Wednesday — Upper C", "Thursday — Legs",
    ]);
    expect(program.restDays).toEqual([
      { title: "Monday", activity: "Rest — walk" }, { title: "Tuesday", activity: "Rest — walk" },
    ]);
    expect(program.days.map((day) => day.exercises.reduce((sum, item) => sum + item.sets, 0))).toEqual([23, 20, 22, 19]);
  });

  it.each([
    [0, [
      ["barbell-bench-press", 4, "6–8"], ["single-arm-dumbbell-row", 4, "8–10 each arm"],
      ["lat-pulldown", 3, "10–12"], ["pec-deck-fly", 3, "12–15"],
      ["barbell-curl", 3, "10"], ["cable-triceps-pushdown", 3, "12"], ["farmers-walk", 3, "30–40 s"],
    ]],
    [1, [
      ["machine-shoulder-press", 4, "8–10"], ["dumbbell-lateral-raise", 4, "12–15"], ["cable-face-pull", 3, "15"],
      ["ez-bar-preacher-curl", 3, "10–12"], ["dumbbell-hammer-curl", 3, "12"], ["overhead-cable-triceps-extension", 3, "12"],
    ]],
    [2, [
      ["incline-dumbbell-press", 4, "8–10"], ["pull-up", 4, "8–10"], ["seated-cable-row", 3, "10–12"],
      ["dumbbell-lateral-raise", 3, "15"], ["incline-dumbbell-curl", 3, "10–12"],
      ["farmers-walk", 3, "30–40 s"], ["dead-hang", 2, "max"],
    ]],
    [3, [
      ["barbell-back-squat", 3, "8–10"], ["leg-press", 3, "10–12"], ["leg-extension", 3, "12"],
      ["lying-leg-curl", 3, "12"], ["barbell-hip-thrust", 3, "10–12"], ["standing-machine-calf-raise", 4, "12–15"],
    ]],
  ] as const)("preserves every exercise, set and rep prescription for day %i", (day, expected) => {
    expect(program.days[day].exercises.map(({ slug, sets, reps }) => [slug, sets, reps])).toEqual(expected);
  });

  it("preserves grip cues and all supplied alternatives in the overview and player", () => {
    expect(program.days[0].instructions).toContain("cable or machine");
    expect(program.days[0].exercises[2].note).toContain("wide grip");
    expect(program.days[0].exercises[3].note).toContain("cable or machine");
    expect(program.days[2].instructions).toContain("close-grip lat pulldowns");
    expect(program.days[2].exercises[1].note).toContain("close-grip lat pulldown");
    expect(program.days[3].instructions).toContain("light Romanian deadlift");
    expect(program.days[3].exercises[4].note).toContain("light Romanian deadlift");
  });
});
