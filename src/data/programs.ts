export interface ProgramExercise {
  slug: string;
  sets: number;
  /** Reps per set, or seconds for timed holds (e.g. "12", "8–10", "40 s"). */
  reps: string;
  /** Rest between sets in seconds. */
  rest: number;
}

export interface ProgramDay {
  title: string;
  focus: string;
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
}

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
