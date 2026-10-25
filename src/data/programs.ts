export interface ProgramExercise {
  slug: string;
  sets: number;
  /** Reps per set, or seconds for timed holds (e.g. "12", "8–10", "40 s"). */
  reps: string;
  /** Rest between sets in seconds. */
  rest: number;
  note?: string;
  /** Adjacent exercises with the same ID alternate sets. */
  superset?: string;
}

export interface ProgramDay {
  title: string;
  focus: string;
  instructions?: string;
  exercises: ProgramExercise[];
}

export interface Program {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  equipment: string;
  daysPerWeek: number;
  accent: string;
  days: ProgramDay[];
  restDays?: { title: string; activity: string }[];
  /** A new revision keeps old, reordered workouts from appearing complete. */
  progressVersion?: number;
}

export const programProgressKey = (program: Program) =>
  program.progressVersion ? `${program.slug}:v${program.progressVersion}` : program.slug;

const ex = (slug: string, sets: number, reps: string, rest = 90): ProgramExercise => ({ slug, sets, reps, rest });

/** Seven-day core challenge: the same moves, a little more volume every day. */
const coreChallenge: ProgramDay[] = Array.from({ length: 7 }, (_, i) => {
  const reps = 15 + i * 5;
  return {
    title: `Day ${i + 1}`,
    focus: i === 6 ? "Final test" : "Core",
    exercises: [
      ex("crunch", 3, String(reps), 45),
      ex("mountain-climber", 3, String(reps + 10), 45),
      ex("glute-bridge", 3, String(reps), 45),
      ex("forearm-plank", 3, `${30 + i * 5} s`, 45),
    ],
  };
});

export const PROGRAMS: Program[] = [
  {
    slug: "home-brick-workout",
    name: "Home Brick Workout",
    tagline: "Full body, arms and core with simple home equipment.",
    description:
      "Fourteen moves in one full-body session using light bricks, a wall and a sturdy seat or fixed counter. Repeat on 2–3 non-consecutive days each week. Warm up with 5 minutes of easy walking. Start with 1 set per exercise if needed, then work toward the 2 sets listed. Use clean, intact bricks with a secure grip. Replace wall sits with 2 sets of 8–12 comfortable partial squats if preferred. Stop any movement that causes pain.",
    level: "Beginner",
    equipment: "Bricks, wall, sturdy support",
    daysPerWeek: 3,
    accent: "from-amber-500 to-orange-400",
    days: [
      {
        title: "Full Body + Arms + Core",
        focus: "Legs, back, chest, arms and core",
        instructions:
          "Follow steps 01–14 in order. Complete both sets of each exercise, resting for the time shown, before moving to the next step. For each-arm or each-leg moves, work both sides before finishing the set. Start with the standing lifts, finish the standing accessories, then move to the seat and floor. Core comes last. Finish with a few minutes of easy walking.",
        exercises: [
          ex("brick-romanian-deadlift", 2, "10–12", 60),
          ex("incline-push-up", 2, "8–12", 60),
          ex("brick-bent-over-row", 2, "10–12", 60),
          ex("wall-sit", 2, "20–30 s", 60),
          ex("bodyweight-calf-raise", 2, "12–15", 45),
          ex("brick-biceps-curl", 2, "10–12 each arm", 60),
          ex("overhead-brick-triceps-extension", 2, "10–12", 60),
          ex("seated-knee-extension", 2, "10–12 each leg", 45),
          ex("glute-bridge", 2, "12–15", 45),
          ex("straight-leg-raise", 2, "10 each leg", 45),
          ex("plank-shoulder-tap", 2, "12–20 total taps", 45),
          ex("bent-knee-leg-raise", 2, "8–12", 45),
          ex("bicycle-crunch", 2, "16–20 total", 45),
          ex("brick-russian-twist", 2, "16–20 total", 45),
        ],
      },
    ],
  },
  {
    slug: "my-gym-plan-v2",
    name: "My Gym Plan — v2",
    tagline: "Three upper days and one leg day, with walking on Monday and Tuesday.",
    description:
      "Saturday: Upper A — heavy chest and back. Sunday: Upper B — shoulders and arms. Monday and Tuesday: rest with a walk. Wednesday: Upper C — chest and back with an incline / vertical focus. Thursday: legs. Follow the sets and reps below, including Saturday’s arm superset and Wednesday’s carries and dead hangs.",
    level: "Intermediate",
    equipment: "Full gym",
    daysPerWeek: 4,
    accent: "from-rose-500 to-orange-300",
    progressVersion: 2,
    restDays: [
      { title: "Monday", activity: "Rest — walk" },
      { title: "Tuesday", activity: "Rest — walk" },
    ],
    days: [
      {
        title: "Saturday — Upper A",
        focus: "Chest & Back (heavy)",
        instructions:
          "Use a heavy dumbbell for the row and complete both arms each set. Use a wide grip for lat pulldowns. Choose a cable or machine chest fly. Superset barbell curls with triceps pushdowns: 10 curls, then 12 pushdowns, for 3 rounds. Finish with 3 farmer’s carries of 30–40 seconds.",
        exercises: [
          ex("barbell-bench-press", 4, "6–8", 120),
          { ...ex("single-arm-dumbbell-row", 4, "8–10 each arm", 90), note: "Heavy dumbbell row. Complete both arms each set." },
          { ...ex("lat-pulldown", 3, "10–12", 90), note: "Use a wide grip." },
          { ...ex("pec-deck-fly", 3, "12–15", 60), note: "Chest fly: cable or machine." },
          { ...ex("barbell-curl", 3, "10", 60), superset: "arms", note: "Superset: follow each set immediately with 12 triceps pushdowns." },
          { ...ex("cable-triceps-pushdown", 3, "12", 60), superset: "arms", note: "Superset: alternate with 10 barbell curls for 3 rounds." },
          ex("farmers-walk", 3, "30–40 s", 60),
        ],
      },
      {
        title: "Sunday — Upper B",
        focus: "Shoulders & Arms",
        exercises: [
          ex("machine-shoulder-press", 4, "8–10", 90),
          ex("dumbbell-lateral-raise", 4, "12–15", 60),
          ex("cable-face-pull", 3, "15", 60),
          ex("ez-bar-preacher-curl", 3, "10–12", 60),
          ex("dumbbell-hammer-curl", 3, "12", 60),
          ex("overhead-cable-triceps-extension", 3, "12", 60),
        ],
      },
      {
        title: "Wednesday — Upper C",
        focus: "Chest & Back (incline / vertical)",
        instructions:
          "Pull-ups may be replaced with close-grip lat pulldowns for the same 4 sets of 8–10 reps. Finish with 3 farmer’s carries of 30–40 seconds, then 2 dead hangs for your maximum hold time.",
        exercises: [
          ex("incline-dumbbell-press", 4, "8–10", 90),
          { ...ex("pull-up", 4, "8–10", 90), note: "Or close-grip lat pulldown: 4 × 8–10." },
          ex("seated-cable-row", 3, "10–12", 90),
          ex("dumbbell-lateral-raise", 3, "15", 60),
          ex("incline-dumbbell-curl", 3, "10–12", 60),
          ex("farmers-walk", 3, "30–40 s", 60),
          ex("dead-hang", 2, "max", 60),
        ],
      },
      {
        title: "Thursday — Legs",
        focus: "Quads, hamstrings, glutes & calves",
        instructions: "Choose hip thrusts or a light Romanian deadlift for 3 sets of 10–12 reps.",
        exercises: [
          ex("barbell-back-squat", 3, "8–10", 120),
          ex("leg-press", 3, "10–12", 90),
          ex("leg-extension", 3, "12", 60),
          ex("lying-leg-curl", 3, "12", 60),
          { ...ex("barbell-hip-thrust", 3, "10–12", 90), note: "Or light Romanian deadlift: 3 × 10–12." },
          ex("standing-machine-calf-raise", 4, "12–15", 60),
        ],
      },
    ],
  },
  {
    slug: "beginner-full-body",
    name: "Beginner Full Body",
    tagline: "3 days a week. Learn the big lifts.",
    description:
      "A simple, proven start for new members: three full-body sessions a week built around the fundamental movement patterns — squat, hinge, push and pull.",
    level: "Beginner",
    equipment: "Dumbbells, bench, cable",
    daysPerWeek: 3,
    accent: "from-emerald-400 to-lime-300",
    days: [
      {
        title: "Day A",
        focus: "Full body",
        exercises: [
          ex("dumbbell-forward-lunge", 3, "10 each leg"),
          ex("push-up", 3, "8–12"),
          ex("bent-over-dumbbell-row", 3, "10–12"),
          ex("glute-bridge", 3, "15", 60),
          ex("forearm-plank", 3, "30 s", 45),
        ],
      },
      {
        title: "Day B",
        focus: "Full body",
        exercises: [
          ex("dumbbell-bulgarian-split-squat", 3, "8 each leg"),
          ex("incline-dumbbell-press", 3, "10"),
          ex("lat-pulldown", 3, "10–12"),
          ex("dumbbell-lateral-raise", 3, "15", 60),
          ex("crunch", 3, "20", 45),
        ],
      },
      {
        title: "Day C",
        focus: "Full body",
        exercises: [
          ex("kettlebell-swing", 4, "15"),
          ex("dumbbell-fly", 3, "12", 60),
          ex("single-arm-dumbbell-row", 3, "10 each arm", 60),
          ex("dumbbell-alternate-biceps-curl", 2, "10 each arm", 60),
          ex("cable-triceps-pushdown", 2, "12", 60),
          ex("standing-dumbbell-calf-raise", 3, "15", 45),
        ],
      },
    ],
  },
  {
    slug: "push-pull-legs",
    name: "Push / Pull / Legs",
    tagline: "The classic split for size and strength.",
    description:
      "Train each movement pattern hard once per rotation. Run it 3 days a week, or twice through for 6 days if you recover well.",
    level: "Intermediate",
    equipment: "Full gym",
    daysPerWeek: 3,
    accent: "from-orange-400 to-amber-300",
    days: [
      {
        title: "Push",
        focus: "Chest · Shoulders · Triceps",
        exercises: [
          ex("barbell-bench-press", 4, "6–8", 150),
          ex("barbell-overhead-press", 3, "8", 120),
          ex("incline-dumbbell-press", 3, "10"),
          ex("dumbbell-lateral-raise", 3, "15", 60),
          ex("dumbbell-standing-triceps-extension", 3, "12", 60),
          ex("cable-triceps-pushdown", 3, "12–15", 60),
        ],
      },
      {
        title: "Pull",
        focus: "Back · Rear delts · Biceps",
        exercises: [
          ex("conventional-deadlift", 3, "5", 180),
          ex("pull-up", 4, "6–10", 120),
          ex("bent-over-barbell-row", 3, "8–10"),
          ex("cable-face-pull", 3, "15", 60),
          ex("dumbbell-alternate-biceps-curl", 3, "10 each arm", 60),
        ],
      },
      {
        title: "Legs",
        focus: "Quads · Glutes · Hamstrings",
        exercises: [
          ex("barbell-back-squat", 4, "6–8", 150),
          ex("barbell-romanian-deadlift", 3, "8–10", 120),
          ex("dumbbell-bulgarian-split-squat", 3, "10 each leg"),
          ex("standing-dumbbell-calf-raise", 4, "12–15", 60),
          ex("hanging-leg-raise", 3, "10–12", 60),
        ],
      },
    ],
  },
  {
    slug: "back-builder",
    name: "Back Builder",
    tagline: "Rows, pulls and face pulls for a thick, wide back.",
    description:
      "A focused back day to add on to any routine. Heavy rows for thickness, vertical pulls for width and face pulls for healthy, rounded shoulders.",
    level: "Intermediate",
    equipment: "Barbell, dumbbells, cable",
    daysPerWeek: 1,
    accent: "from-red-500 to-orange-400",
    days: [
      {
        title: "Back Day",
        focus: "Lats · Upper back · Rear delts",
        exercises: [
          ex("bent-over-dumbbell-row", 4, "10–12"),
          ex("bent-over-barbell-row", 4, "8–12"),
          ex("single-arm-dumbbell-row", 3, "12–15 each arm", 60),
          ex("lat-pulldown", 3, "10–12"),
          ex("cable-face-pull", 4, "12–15", 60),
        ],
      },
    ],
  },
  {
    slug: "7-day-core-challenge",
    name: "7-Day Core Challenge",
    tagline: "No equipment. A little harder every day.",
    description:
      "Seven short sessions you can do at home or at the end of a gym workout. Reps and hold times climb each day — finish Day 7 and you'll feel the difference.",
    level: "Beginner",
    equipment: "None",
    daysPerWeek: 7,
    accent: "from-sky-400 to-cyan-300",
    days: coreChallenge,
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
