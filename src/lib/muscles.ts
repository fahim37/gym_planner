export const MUSCLE_IDS = [
  "chest",
  "front-delts",
  "side-delts",
  "rear-delts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "traps",
  "lats",
  "upper-back",
  "lower-back",
  "glutes",
  "quads",
  "hamstrings",
  "adductors",
  "calves",
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export type BodyRegion = "Chest" | "Back" | "Shoulders" | "Arms" | "Core" | "Legs";

export interface Muscle {
  id: MuscleId;
  name: string;
  latin: string;
  region: BodyRegion;
  /** Which side of the body shows it best. */
  view: "front" | "back";
  function: string;
}

export const MUSCLES: Record<MuscleId, Muscle> = {
  chest: {
    id: "chest",
    name: "Chest",
    latin: "Pectoralis major",
    region: "Chest",
    view: "front",
    function: "Pushes the arms forward and pulls them across the body — every press and fly.",
  },
  "front-delts": {
    id: "front-delts",
    name: "Front delts",
    latin: "Anterior deltoid",
    region: "Shoulders",
    view: "front",
    function: "Raises the arm forward and overhead; a strong helper in all pressing.",
  },
  "side-delts": {
    id: "side-delts",
    name: "Side delts",
    latin: "Lateral deltoid",
    region: "Shoulders",
    view: "front",
    function: "Lifts the arm out to the side. Builds shoulder width.",
  },
  "rear-delts": {
    id: "rear-delts",
    name: "Rear delts",
    latin: "Posterior deltoid",
    region: "Shoulders",
    view: "back",
    function: "Pulls the arm backward. Key for posture and healthy shoulders.",
  },
  biceps: {
    id: "biceps",
    name: "Biceps",
    latin: "Biceps brachii",
    region: "Arms",
    view: "front",
    function: "Bends the elbow and turns the palm up.",
  },
  triceps: {
    id: "triceps",
    name: "Triceps",
    latin: "Triceps brachii",
    region: "Arms",
    view: "back",
    function: "Straightens the elbow. Two-thirds of upper-arm size.",
  },
  forearms: {
    id: "forearms",
    name: "Forearms",
    latin: "Wrist flexors & extensors",
    region: "Arms",
    view: "front",
    function: "Grip strength and wrist control.",
  },
  abs: {
    id: "abs",
    name: "Abs",
    latin: "Rectus abdominis",
    region: "Core",
    view: "front",
    function: "Curls the spine forward and braces the trunk.",
  },
  obliques: {
    id: "obliques",
    name: "Obliques",
    latin: "External & internal obliques",
    region: "Core",
    view: "front",
    function: "Rotates and side-bends the trunk; resists twisting.",
  },
  traps: {
    id: "traps",
    name: "Traps",
    latin: "Trapezius",
    region: "Back",
    view: "back",
    function: "Shrugs, retracts and stabilises the shoulder blades.",
  },
  lats: {
    id: "lats",
    name: "Lats",
    latin: "Latissimus dorsi",
    region: "Back",
    view: "back",
    function: "Pulls the arms down and back — the V-taper muscle.",
  },
  "upper-back": {
    id: "upper-back",
    name: "Upper back",
    latin: "Rhomboids & mid traps",
    region: "Back",
    view: "back",
    function: "Squeezes the shoulder blades together.",
  },
  "lower-back": {
    id: "lower-back",
    name: "Lower back",
    latin: "Erector spinae",
    region: "Back",
    view: "back",
    function: "Keeps the spine straight under load and extends the hips.",
  },
  glutes: {
    id: "glutes",
    name: "Glutes",
    latin: "Gluteus maximus",
    region: "Legs",
    view: "back",
    function: "Extends the hip — the engine of squats, deadlifts and sprinting.",
  },
  quads: {
    id: "quads",
    name: "Quads",
    latin: "Quadriceps femoris",
    region: "Legs",
    view: "front",
    function: "Straightens the knee.",
  },
  hamstrings: {
    id: "hamstrings",
    name: "Hamstrings",
    latin: "Biceps femoris & co.",
    region: "Legs",
    view: "back",
    function: "Bends the knee and extends the hip.",
  },
  adductors: {
    id: "adductors",
    name: "Adductors",
    latin: "Adductor magnus & co.",
    region: "Legs",
    view: "front",
    function: "Pulls the legs together and helps drive out of a deep squat.",
  },
  calves: {
    id: "calves",
    name: "Calves",
    latin: "Gastrocnemius & soleus",
    region: "Legs",
    view: "back",
    function: "Points the foot — every step, jump and sprint.",
  },
};

export const REGIONS: BodyRegion[] = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"];

export function musclesInRegion(region: BodyRegion): Muscle[] {
  return Object.values(MUSCLES).filter((m) => m.region === region);
}

export function isMuscleId(id: string): id is MuscleId {
  return (MUSCLE_IDS as readonly string[]).includes(id);
}
