import type { AngleLimb, LimbSpec, Pose, Prop } from "@/lib/anatomy/types";
import type { Exercise } from "@/lib/exercise-types";
import { handLocal, lyingOnBack, planted, repFrames } from "@/data/poses";

// ─────────────────────────── helpers ───────────────────────────

const MAT: Prop = { type: "mat" };
const DEG = Math.PI / 180;

/** Straight leg for floor work, `a` degrees (90 = along the floor towards +x, 180 = vertical); feet relaxed. */
const straightLeg = (a: number, point = 15): AngleLimb => ({ angles: [a, a], foot: point - a });

/** Arms resting by the sides with the palms on the floor (lying face up). */
const ARMS_ON_FLOOR: LimbSpec = { ik: { x: 150, y: 246, z: 24 }, pole: [0, -1, 0.3] };

/** Both hands on one handle centred at world (x, y, z); `z` is signed (+ = near side). */
function bothHands(x: number, y: number, z: number, pole: [number, number, number], gap = 4): [LimbSpec, LimbSpec] {
  return [
    { ik: { x, y, z: z + gap }, pole },
    { ik: { x, y, z: gap - z }, pole },
  ];
}

/** Pelvis position that keeps the hip joints at (x, y) for a given torso lean. */
const pelvisFor = (x: number, y: number, torso: number): [number, number] => [x + 3 * Math.sin(torso * DEG), y - 3 * Math.cos(torso * DEG)];

/** Fingertips at the temples, following the shoulders when the torso twists. */
function templeHands(twist: number): [LimbSpec, LimbSpec] {
  const s = Math.sin(twist * DEG);
  const c = Math.cos(twist * DEG);
  return [handLocal(4 + 11 * s, -17, 11 * c, [0.1, -0.3, 1]), handLocal(4 - 11 * s, -17, 11 * c, [0.1, -0.3, 1])];
}

/**
 * Both hands in front of the chest (e.g. holding a ball), rotating with a
 * shoulder twist. `reach` is the distance in front of the chest, `drop` how far
 * down the spine, `half` the half-gap between the hands.
 */
function heldInFront(twist: number, reach: number, drop: number, half: number, pole: [number, number, number]): [LimbSpec, LimbSpec] {
  const s = Math.sin(twist * DEG);
  const c = Math.cos(twist * DEG);
  // chestForward = forward·c − side·s; chestSide = side·c + forward·s.
  return [
    handLocal(reach * c + half * s, drop, -reach * s + half * c, pole),
    handLocal(reach * c - half * s, drop, reach * s + half * c, pole),
  ];
}

// ───────────────────────────── CORE ─────────────────────────────

const CORE: Exercise[] = [
  {
    slug: "sit-up",
    name: "Sit-Up",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques", "quads"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "The full-range classic: curl all the way up from the floor to sitting tall.",
    steps: [
      "Lie on your back with knees bent and feet flat, hip-width apart.",
      "Cross your arms over your chest, hands on the opposite shoulders.",
      "Tuck your chin slightly and curl your head and shoulders off the floor.",
      "Keep curling until your torso is upright over your hips.",
      "Lower back down one vertebra at a time until your shoulders touch the mat.",
    ],
    tips: [
      "Anchor your feet under a bench or dumbbell if they lift off the floor.",
      "Lead with your chest, not your chin, so your neck stays relaxed.",
    ],
    mistakes: ["Yanking up with momentum", "Pulling on the head or neck", "Dropping back to the floor instead of lowering"],
    breathing: "Exhale as you curl up, inhale as you lower.",
    prescription: { sets: "3", reps: "12–20", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const arms: [LimbSpec, LimbSpec] = [handLocal(13, 8, -7, [1, -0.2, 0.8]), handLocal(9, 12, -7, [1, -0.2, 0.8])];
        return repFrames(
          lyingOnBack(239, -90, arms),
          { ...lyingOnBack(238, -12, arms), head: 10 },
          { go: 1.1, back: 1.4, hold: 0.2, cues: ["Curl all the way up", "Lower slowly"] },
        );
      })(),
    },
  },
  {
    slug: "bicycle-crunch",
    name: "Bicycle Crunch",
    region: "Core",
    primary: ["abs", "obliques"],
    secondary: ["quads"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A twisting crunch that hits the obliques and abs together with a pedalling leg action.",
    steps: [
      "Lie on your back with your fingertips at your temples and your lower back pressed into the floor.",
      "Lift your shoulders off the floor and raise your legs with knees bent.",
      "Twist to bring one elbow toward the opposite knee while you straighten the other leg.",
      "Switch sides in a smooth pedalling motion.",
      "Keep your shoulders off the floor for the whole set.",
    ],
    tips: [
      "Rotate from your ribs — the shoulder moves toward the knee, not just the elbow.",
      "Slow down: a controlled twist beats fast, flapping elbows.",
    ],
    mistakes: ["Pulling the head forward with the hands", "Only moving the elbows", "Arching the lower back as the leg straightens"],
    breathing: "Exhale on each twist, inhale as you pass through the middle.",
    prescription: { sets: "3", reps: "20–30 total", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const tuck: AngleLimb = { angles: [204, 100], foot: -74 };
        const long = straightLeg(116, 20);
        const side = (twist: number, legs: [LimbSpec, LimbSpec]): Pose => ({
          ...lyingOnBack(239, -58, templeHands(twist)),
          head: 12,
          twist,
          legs,
        });
        return [
          { pose: side(40, [long, tuck]), dur: 0.7, hold: 0.1, cue: "Elbow to the opposite knee", rep: true },
          { pose: side(-40, [tuck, long]), dur: 0.7, hold: 0.1, cue: "Switch sides", rep: true },
        ];
      })(),
    },
  },
  {
    slug: "russian-twist",
    name: "Russian Twist",
    region: "Core",
    primary: ["obliques"],
    secondary: ["abs", "lower-back"],
    equipment: ["Medicine ball"],
    gear: ["exercise-mat", "medicine-ball"],
    level: "Intermediate",
    mechanics: "Isolation",
    summary: "Seated rotation that builds strong obliques and control through the trunk.",
    steps: [
      "Sit on the floor with knees bent and hold a medicine ball in front of your chest.",
      "Lean back to about 45° with a long, straight spine.",
      "Lift your feet a few centimetres off the floor (keep heels down to make it easier).",
      "Rotate your shoulders to bring the ball beside one hip.",
      "Turn through the middle to the other side — that's two reps.",
    ],
    tips: [
      "Move the ball with your ribcage; your arms just hold it.",
      "Follow the ball with your eyes so your head turns with your shoulders.",
    ],
    mistakes: ["Rounding the back and slumping", "Only swinging the arms", "Rushing so the knees swing side to side"],
    breathing: "Exhale as you turn to each side, inhale through the middle.",
    prescription: { sets: "3", reps: "20–30 total", rest: "45 s" },
    animation: {
      props: [MAT, { type: "extra", kind: "core:medicine-ball" }],
      frames: (() => {
        // The ball passes high in front of the belly and drops beside the hip at each side.
        const seat = (twist: number, reach: number, drop: number): Pose => ({
          hip: [160, 237],
          torso: -42,
          twist,
          head: 8,
          arms: heldInFront(twist, reach, drop, 14, [-0.3, 0.8, 1]),
          legs: [{ ik: { x: 210, y: 232, z: 12 }, pole: [0.3, -1, 0.1], foot: 12 }],
        });
        return [
          { pose: seat(0, 32, 32), dur: 0.45, cue: "Turn to the side", rep: true },
          { pose: seat(50, 26, 42), dur: 0.45, hold: 0.1, cue: "Back through the middle" },
          { pose: seat(0, 32, 32), dur: 0.45, cue: "Turn to the other side", rep: true },
          { pose: seat(-50, 26, 42), dur: 0.45, hold: 0.1, cue: "Back through the middle" },
        ];
      })(),
    },
  },
  {
    slug: "lying-leg-raise",
    name: "Lying Leg Raise",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques", "quads"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Floor-based leg raise that targets the lower abs with no equipment.",
    steps: [
      "Lie on your back with legs straight and arms by your sides, palms down.",
      "Press your lower back into the floor and brace your abs.",
      "Keeping your legs straight, raise them until they point at the ceiling.",
      "Lower them slowly until your heels hover just above the floor.",
    ],
    tips: [
      "Only lower as far as you can keep your lower back flat.",
      "Bend your knees slightly if your hamstrings are tight.",
    ],
    mistakes: ["Lower back arching off the floor", "Dropping the legs quickly", "Pushing hard through the hands"],
    breathing: "Exhale as you raise your legs, inhale as you lower them.",
    prescription: { sets: "3", reps: "10–15", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: repFrames(
        { ...lyingOnBack(239, -90, [ARMS_ON_FLOOR]), legs: [straightLeg(97)] },
        { ...lyingOnBack(239, -90, [ARMS_ON_FLOOR]), legs: [straightLeg(176, 5)] },
        { go: 1.2, back: 1.8, hold: 0.2, cues: ["Raise your legs", "Lower slowly — don't touch down"] },
      ),
    },
  },
  {
    slug: "flutter-kicks",
    name: "Flutter Kicks",
    region: "Core",
    primary: ["abs"],
    secondary: ["quads", "obliques"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Small, fast alternating kicks that keep the lower abs working the whole time.",
    steps: [
      "Lie on your back with legs straight and arms by your sides.",
      "Press your lower back down and lift both heels a few centimetres off the floor.",
      "Raise one leg a little higher while the other lowers, like a swimming kick.",
      "Keep alternating in small, quick kicks without letting either heel touch down.",
    ],
    tips: ["Keep the kicks small — about a hand's width apart.", "Lift your head slightly and look at your toes to stay braced."],
    mistakes: ["Lower back arching", "Big, swinging kicks", "Bending the knees"],
    breathing: "Breathe steadily — one breath every few kicks.",
    prescription: { sets: "3", reps: "20–40 s", rest: "30 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const base = lyingOnBack(239, -90, [ARMS_ON_FLOOR]);
        return [
          { pose: { ...base, head: 14, legs: [straightLeg(110, 35), straightLeg(98, 35)] }, dur: 0.32, cue: "Small, quick kicks", rep: true },
          { pose: { ...base, head: 14, legs: [straightLeg(98, 35), straightLeg(110, 35)] }, dur: 0.32, rep: true },
        ];
      })(),
    },
  },
  {
    slug: "dead-bug",
    name: "Dead Bug",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Slow opposite-arm, opposite-leg reaches that teach you to brace your core and protect your back.",
    steps: [
      "Lie on your back with arms pointing straight at the ceiling.",
      "Lift your legs so your hips and knees are bent at 90°.",
      "Press your lower back into the floor.",
      "Slowly reach one arm overhead while straightening the opposite leg until both hover above the floor.",
      "Return to the start and repeat on the other side.",
    ],
    tips: ["Move slowly — about three seconds out, three seconds back.", "If your back lifts, don't reach as far."],
    mistakes: ["Lower back arching off the floor", "Moving too fast", "Moving the same-side arm and leg"],
    breathing: "Exhale fully as you reach out, inhale as you return.",
    prescription: { sets: "3", reps: "8–12 each side", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const up: AngleLimb = { angles: [180, 180] };
        const over: AngleLimb = { angles: [258, 258] };
        const table: AngleLimb = { angles: [180, 90], foot: -70 };
        const long = straightLeg(100, 20);
        const base = lyingOnBack(239, -90, [up]);
        return [
          { pose: { ...base, arms: [up, up], legs: [table, table] }, dur: 1.3, cue: "Reach opposite arm and leg", rep: true },
          { pose: { ...base, arms: [over, up], legs: [table, long] }, dur: 1.2, hold: 0.3, cue: "Back to the middle" },
          { pose: { ...base, arms: [up, up], legs: [table, table] }, dur: 1.3, cue: "Other side", rep: true },
          { pose: { ...base, arms: [up, over], legs: [long, table] }, dur: 1.2, hold: 0.3, cue: "Back to the middle" },
        ];
      })(),
    },
  },
  {
    slug: "hollow-body-hold",
    name: "Hollow Body Hold",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques", "quads"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Intermediate",
    mechanics: "Isolation",
    hold: true,
    summary: "The gymnast's core hold: a long, tight banana shape with the lower back glued to the floor.",
    steps: [
      "Lie on your back with arms overhead and legs straight.",
      "Press your lower back firmly into the floor.",
      "Lift your shoulders, arms and legs a few centimetres off the floor.",
      "Squeeze your legs together and point your toes.",
      "Hold the shape without letting your lower back lift.",
    ],
    tips: ["Bend your knees or bring your arms to your sides to make it easier.", "The lower your arms and legs, the harder it gets."],
    mistakes: ["Lower back peeling off the floor", "Holding your breath", "Chin jutting forward"],
    breathing: "Take short, steady breaths while keeping your abs tight.",
    prescription: { sets: "3", reps: "20–40 s hold", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const pose = (lift: number): Pose => ({
          hip: [160, 239],
          torso: -78 + lift,
          head: 16,
          arms: [{ angles: [262 - lift, 262 - lift], spread: [8, 6] }],
          legs: [straightLeg(104 + lift, 45)],
        });
        return [
          { pose: pose(0), dur: 2, cue: "Lower back pressed down", rep: true },
          { pose: pose(1.5), dur: 2, cue: "Stay long and tight" },
        ];
      })(),
    },
  },
  {
    slug: "v-up",
    name: "V-Up",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques", "quads"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "Fold in half from a hollow position — an explosive, full-range ab move.",
    steps: [
      "Lie on your back with arms overhead and legs straight, both just off the floor.",
      "Brace your abs and lift your arms, shoulders and legs together.",
      "Reach your hands toward your shins at the top, balancing on your hips.",
      "Lower back down with control to the start position without resting.",
    ],
    tips: ["Keep your legs straight and together throughout.", "Too hard? Try alternating single-leg V-ups or a tuck-up."],
    mistakes: ["Swinging the arms to throw yourself up", "Bending the knees at the top", "Crashing down to the floor"],
    breathing: "Exhale as you fold up, inhale as you lower.",
    prescription: { sets: "3", reps: "8–15", rest: "60 s" },
    animation: {
      props: [MAT],
      frames: repFrames(
        { hip: [160, 239], torso: -86, head: 10, arms: [{ angles: [262, 262], spread: [6, 4] }], legs: [straightLeg(98, 40)] },
        { hip: [160, 237], torso: -28, head: 8, arms: [{ angles: [104, 104], spread: [2, 0] }], legs: [straightLeg(148, 40)] },
        { go: 0.8, back: 1.3, hold: 0.2, cues: ["Fold up and reach", "Lower with control"] },
      ),
    },
  },
  {
    slug: "reverse-crunch",
    name: "Reverse Crunch",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Curl your hips off the floor to train the lower part of the abs with no strain on the neck.",
    steps: [
      "Lie on your back with arms by your sides and palms down.",
      "Lift your legs so your knees are bent 90° over your hips.",
      "Curl your hips off the floor, bringing your knees toward your chest.",
      "Pause, then lower your hips slowly until your tailbone touches down.",
    ],
    tips: ["Think about tilting your pelvis toward your ribs, not swinging your legs.", "Keep the knee angle fixed."],
    mistakes: ["Swinging the legs for momentum", "Pushing hard through the hands", "Letting the feet drop to the floor between reps"],
    breathing: "Exhale as you curl your hips up, inhale as you lower.",
    prescription: { sets: "3", reps: "12–20", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: repFrames(
        { ...lyingOnBack(239, -90, [ARMS_ON_FLOOR]), legs: [{ angles: [176, 84], foot: -64 }] },
        { hip: [158, 221], torso: -106, head: 22, arms: [ARMS_ON_FLOOR], legs: [{ angles: [214, 118], foot: -96 }] },
        { go: 0.9, back: 1.3, hold: 0.3, cues: ["Curl your hips up", "Lower slowly"] },
      ),
    },
  },
  {
    slug: "bird-dog",
    name: "Bird Dog",
    region: "Core",
    primary: ["lower-back", "glutes"],
    secondary: ["abs", "obliques", "hamstrings", "front-delts"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Opposite arm and leg reaches from all fours that build a stable, pain-resistant back.",
    steps: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "Brace your abs so your back stays flat, like a table top.",
      "Reach one arm straight forward and the opposite leg straight back until both are level with your torso.",
      "Hold for a second without letting your hips tilt or rotate.",
      "Return to all fours and repeat with the other arm and leg.",
    ],
    tips: ["Imagine balancing a glass of water on your lower back.", "Push the heel back rather than lifting the leg high."],
    mistakes: ["Arching the lower back to lift the leg higher", "Hips rotating open", "Rushing the reps"],
    breathing: "Exhale as you reach out, inhale as you return.",
    prescription: { sets: "3", reps: "8–12 each side", rest: "45 s" },
    animation: {
      camera: "side",
      props: [MAT],
      frames: (() => {
        const hands: LimbSpec = { ik: { x: 206, y: 243, z: 21 }, pole: [-1, 0, 0.2] };
        const reach: LimbSpec = { ik: { x: 258, y: 184, z: 19 }, pole: [0, 1, 0] };
        const kneel: AngleLimb = { angles: [0, -90], foot: 180 };
        const kick: AngleLimb = { angles: [-90, -90], foot: 90 };
        const table = (arms: [LimbSpec, LimbSpec], legs: [LimbSpec, LimbSpec]): Pose => ({ hip: [140, 198.5], torso: 80, arms, legs });
        return [
          { pose: table([hands, hands], [kneel, kneel]), dur: 1.1, cue: "Reach opposite arm and leg", rep: true },
          { pose: table([reach, hands], [kneel, kick]), dur: 1.1, hold: 0.8, cue: "Back to all fours" },
          { pose: table([hands, hands], [kneel, kneel]), dur: 1.1, cue: "Other side", rep: true },
          { pose: table([hands, reach], [kick, kneel]), dur: 1.1, hold: 0.8, cue: "Back to all fours" },
        ];
      })(),
    },
  },
  {
    slug: "superman",
    name: "Superman",
    region: "Back",
    primary: ["lower-back"],
    secondary: ["glutes", "hamstrings", "upper-back", "rear-delts"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A face-down lift that strengthens the whole back of the body with no equipment.",
    steps: [
      "Lie face down with arms stretched overhead and legs straight.",
      "Squeeze your glutes and gently brace your abs.",
      "Lift your arms, chest and legs a few centimetres off the floor at the same time.",
      "Hold for one to two seconds, keeping your neck in line with your spine.",
      "Lower slowly back to the floor.",
    ],
    tips: ["Reach long through your fingers and toes rather than lifting high.", "Look at the floor just in front of you, not forward."],
    mistakes: ["Cranking the head back", "Bending the knees to lift the feet", "Jerking up with momentum"],
    breathing: "Exhale as you lift, inhale as you lower.",
    prescription: { sets: "3", reps: "10–15", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: repFrames(
        { hip: [148, 238], torso: 88, head: -4, arms: [{ angles: [84, 84], spread: [12, 8] }], legs: [{ angles: [-90, -90], foot: 168 }] },
        { hip: [148, 238], torso: 77, head: -2, arms: [{ angles: [101, 101], spread: [14, 10] }], legs: [{ angles: [-99, -99], foot: 170 }] },
        { go: 0.9, back: 1.2, hold: 1, cues: ["Lift arms, chest and legs", "Lower slowly"] },
      ),
    },
  },
  {
    slug: "ab-wheel-rollout",
    name: "Ab Wheel Rollout",
    region: "Core",
    primary: ["abs"],
    secondary: ["obliques", "lats", "front-delts"],
    equipment: ["Ab wheel"],
    gear: ["exercise-mat", "ab-wheel"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "Roll out from your knees and pull back with your abs — one of the toughest anti-extension moves.",
    steps: [
      "Kneel on a mat and hold the ab wheel on the floor under your shoulders.",
      "Brace your abs and tuck your pelvis slightly so your lower back is flat.",
      "Roll the wheel forward slowly, letting your hips follow, until your body is nearly straight.",
      "Stop just before your lower back starts to sag.",
      "Pull the wheel back toward your knees using your abs, keeping your arms straight.",
    ],
    tips: ["Start with short rollouts and go further as you get stronger.", "Keep your hips moving with your shoulders — don't leave them behind."],
    mistakes: ["Lower back sagging at the far point", "Bending the arms", "Pulling back with the hips high in the air"],
    breathing: "Inhale as you roll out, exhale as you pull back.",
    prescription: { sets: "3", reps: "6–12", rest: "60–90 s" },
    animation: {
      props: [MAT, { type: "extra", kind: "core:ab-wheel" }],
      frames: (() => {
        // Knees stay planted: the hips swing around them on a 45 cm thigh.
        const knee: [number, number] = [130, 243.5];
        const pose = (thigh: number, torso: number, wrist: [number, number]): Pose => ({
          hip: pelvisFor(knee[0] - 45 * Math.sin(thigh * DEG), knee[1] - 45 * Math.cos(thigh * DEG), torso),
          torso,
          head: -6,
          arms: [{ ik: { x: wrist[0], y: wrist[1], z: 13 }, pole: [-1, -0.2, 0.2] }],
          legs: [{ angles: [thigh, -90], foot: 180 }],
        });
        const start = pose(0, 70, [197, 234]);
        const mid = pose(-37.5, 74, [250, 239]);
        const out = pose(-75, 78, [293, 237]);
        return [
          { pose: start, dur: 0.9, cue: "Roll out slowly", rep: true },
          { pose: mid, dur: 0.8 },
          { pose: out, dur: 0.8, hold: 0.3, cue: "Pull back with your abs" },
          { pose: mid, dur: 0.8 },
        ];
      })(),
    },
  },
  {
    slug: "back-extension",
    name: "45° Back Extension",
    region: "Back",
    primary: ["lower-back"],
    secondary: ["glutes", "hamstrings"],
    equipment: ["Bench"],
    gear: ["hyperextension-bench"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Hinge over a hyperextension bench to build strong, resilient spinal erectors and glutes.",
    steps: [
      "Set the pad so its top edge sits just below your hip bones, with your heels under the ankle rollers.",
      "Cross your arms over your chest and start with your body in a straight line.",
      "Hinge at the hips and lower your torso toward the floor, keeping your back flat.",
      "Go down until you feel a stretch in your hamstrings.",
      "Squeeze your glutes to raise your torso back to a straight line — no higher.",
    ],
    tips: ["Hold a weight plate against your chest to progress.", "Round your upper back slightly and squeeze the glutes to shift the work to them."],
    mistakes: ["Hyper-extending past a straight line at the top", "Swinging up with momentum", "Pad set too high, blocking the hinge"],
    breathing: "Inhale as you lower, exhale as you rise.",
    prescription: { sets: "3", reps: "10–15", rest: "60 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "core:hyper-bench", params: { ankleX: 70, ankleY: 228 } }],
      frames: (() => {
        // Legs fixed at 45° from the ankle rollers up to the hips; the torso hinges around the hip joints.
        const hipJoint: [number, number] = [70 + 62.2, 228 - 62.2];
        const arms: [LimbSpec, LimbSpec] = [handLocal(12, 10, -6, [0.3, 1, 0.6]), handLocal(9, 13, -6, [0.3, 1, 0.6])];
        const pose = (torso: number, head: number): Pose => ({
          hip: pelvisFor(hipJoint[0], hipJoint[1], torso),
          torso,
          head,
          arms,
          legs: [{ angles: [-45, -45], foot: 45 }],
        });
        return repFrames(pose(45, 0), pose(132, 12), { go: 1.4, back: 1.1, hold: 0.3, cues: ["Hinge down slowly", "Squeeze your glutes to rise"] });
      })(),
    },
  },
  {
    slug: "cable-woodchop",
    name: "Cable Woodchop",
    region: "Core",
    primary: ["obliques"],
    secondary: ["abs", "front-delts", "glutes"],
    equipment: ["Cable"],
    gear: ["cable-machine"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "A powerful high-to-low diagonal chop that trains rotational strength for sport and life.",
    steps: [
      "Set a cable pulley high and stand side-on to it, feet wider than shoulder width.",
      "Grab the handle with both hands above the shoulder nearest the machine, arms long.",
      "Rotate your torso and pull the handle diagonally down across your body toward the opposite hip.",
      "Pivot on your back foot and bend your knees slightly as you finish the chop.",
      "Return slowly along the same path. Finish the set, then switch sides.",
    ],
    tips: ["Keep your arms fairly straight and let the trunk do the turning.", "Control the return — resisting the cable is half the exercise."],
    mistakes: ["Pulling only with the arms", "Rounding the back as you chop", "Letting the weight yank you back"],
    breathing: "Exhale as you chop down, inhale on the way back up.",
    prescription: { sets: "3", reps: "10–12 each side", rest: "60 s" },
    animation: {
      // Machine on the far side so the chop comes down toward the camera.
      props: [{ type: "extra", kind: "core:side-cable", params: { x: 165, y: 52, z: -95 } }],
      frames: (() => {
        const feet: [LimbSpec, LimbSpec] = [planted(158, 18, [1, 0, 0.35]), planted(166, 18, [1, 0, 0.35])];
        return repFrames(
          { hip: [160, 162], torso: 2, twist: 40, head: 0, arms: bothHands(186, 86, -38, [0, 1, 0.2]), legs: feet },
          { hip: [158, 172], torso: 12, twist: -42, head: 8, arms: bothHands(192, 147, 32, [0, 1, 0.2]), legs: feet },
          { go: 0.8, back: 1.3, hold: 0.2, cues: ["Chop down across your body", "Return slowly"] },
        );
      })(),
    },
  },
  {
    slug: "pallof-press",
    name: "Pallof Press",
    region: "Core",
    primary: ["obliques", "abs"],
    secondary: ["front-delts", "glutes"],
    equipment: ["Cable"],
    gear: ["cable-machine"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "An anti-rotation press: the cable tries to twist you and your core refuses.",
    steps: [
      "Set a cable at chest height and stand side-on to it, far enough away to feel tension.",
      "Hold the handle with both hands against your sternum, feet shoulder-width, knees soft.",
      "Brace and press the handle straight out in front of your chest.",
      "Hold for two seconds without letting your hands or hips turn toward the machine.",
      "Bring the handle back to your chest. Finish the set, then face the other way.",
    ],
    tips: ["Squeeze your glutes to lock your hips in place.", "Step further from the machine to make it harder."],
    mistakes: ["Rotating toward the cable", "Leaning away from the machine", "Shrugging the shoulders"],
    breathing: "Exhale as you press out, breathe steadily during the hold, inhale as you return.",
    prescription: { sets: "3", reps: "8–12 each side", rest: "45 s" },
    animation: {
      props: [{ type: "extra", kind: "core:side-cable", params: { x: 178, y: 100, z: -100 } }],
      frames: repFrames(
        { hip: [160, 160], torso: 2, arms: bothHands(182, 104, 0, [-0.4, 1, 0.8]), legs: [planted(162, 16, [1, 0, 0.3])] },
        { hip: [160, 160], torso: 2, arms: bothHands(216, 100, 0, [-0.4, 1, 0.8]), legs: [planted(162, 16, [1, 0, 0.3])] },
        { go: 1, back: 1, hold: 1.5, cues: ["Press straight out", "Hold — don't rotate — then return"] },
      ),
    },
  },
  {
    slug: "side-plank",
    name: "Side Plank",
    region: "Core",
    primary: ["obliques"],
    secondary: ["abs", "lower-back", "glutes"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    hold: true,
    summary: "Hold your body in a straight line on one forearm to build strong obliques and hips.",
    steps: [
      "Lie on your side with your elbow directly under your shoulder and your legs stacked.",
      "Lift your hips so your body forms a straight line from head to feet.",
      "Reach your top arm to the ceiling or rest the hand on your hip.",
      "Hold without letting your hips sag or roll forward, then switch sides.",
    ],
    tips: ["Push the floor away with your forearm to keep the shoulder stable.", "Stagger your feet or drop the bottom knee to make it easier."],
    mistakes: ["Hips sagging toward the floor", "Elbow drifting away from under the shoulder", "Rolling the chest toward the floor"],
    breathing: "Breathe slowly and steadily; keep your abs braced.",
    prescription: { sets: "2–3", reps: "20–45 s each side", rest: "30 s" },
    animation: {
      camera: "side",
      props: [MAT],
      frames: (() => {
        // Authored standing up, then rolled onto the far (left) side and turned to face the camera.
        const pose = (roll: number, y: number): Pose => ({
          hip: [160, y],
          torso: 0,
          orient: { roll, yaw: 90 },
          arms: [{ angles: [180, 180], spread: [73, 73] }, { angles: [0, 90], spread: [73, 0] }],
          legs: [{ angles: [0, 0], spread: [-3, -3] }],
        });
        return [
          { pose: pose(-73, 214.5), dur: 2, cue: "Hips high, body straight", rep: true },
          { pose: pose(-72, 214.8), dur: 2, cue: "Breathe and hold" },
        ];
      })(),
    },
  },
];

// ─────────────────────────── export ───────────────────────────

export const CORE_CARDIO_EXERCISES: Exercise[] = [...CORE];
