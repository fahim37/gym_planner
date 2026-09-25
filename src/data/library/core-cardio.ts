import type { AngleLimb, IkLimb, Keyframe, LimbSpec, Pose, Prop } from "@/lib/anatomy/types";
import type { Exercise } from "@/lib/exercise-types";
import { hand, handLocal, lyingOnBack, planted, repFrames } from "@/data/poses";

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

/** Foot placed by IK with an explicit tilt (so every keyframe carries the same keys). */
const footAt = (x: number, y: number, z: number, tilt: number, pole: [number, number, number] = [1, -0.1, 0.12]): IkLimb => ({
  ik: { x, y, z },
  pole,
  foot: tilt,
});

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


// ──────────────────────── CARDIO & CONDITIONING ────────────────────────

const CARDIO: Exercise[] = [
  {
    slug: "burpee",
    name: "Burpee",
    region: "Legs",
    primary: ["quads", "glutes", "chest"],
    secondary: ["front-delts", "triceps", "abs", "calves", "hamstrings"],
    equipment: ["Bodyweight"],
    level: "Intermediate",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Squat, plank and jump in one move — the classic full-body conditioning exercise.",
    steps: [
      "Stand with feet shoulder-width apart.",
      "Squat down and place your hands on the floor just in front of your feet.",
      "Jump your feet back into a high plank with a straight body.",
      "Jump your feet back in toward your hands, landing in a low squat.",
      "Explode up into a jump, reaching your arms overhead, and land softly.",
    ],
    tips: ["Add a push-up in the plank once the basic version feels easy.", "Step back and forward instead of jumping to make it lower impact."],
    mistakes: ["Hips sagging in the plank", "Landing stiff-legged", "Rounding the back when you drop down"],
    breathing: "Exhale as you jump up; take a quick breath as you drop to the floor.",
    prescription: { sets: "3–5", reps: "8–15", rest: "60 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const stand: Pose = { hip: [160, 156], torso: 0, head: 0, arms: [{ angles: [2, 4], spread: [9, 5] }], legs: [footAt(162, 245, 12, 0)] };
        const squat: Pose = { hip: [130, 212], torso: 65, head: -12, arms: [{ angles: [16, 16], spread: [8, 4] }], legs: [footAt(162, 245, 13, 0, [1, -0.3, 0.3])] };
        const plank: Pose = { hip: [150, 204], torso: 72, head: 0, arms: [{ angles: [0, 0], spread: [8, 4] }], legs: [footAt(63.4, 232, 10, 72)] };
        const jump: Pose = { hip: [162, 140], torso: -2, head: -4, arms: [{ angles: [178, 178], spread: [10, 4] }], legs: [footAt(163, 230, 11, 40)] };
        // Feet leave the floor between the squat and the plank so the knees clear it.
        const kick: Pose = { hip: [142, 200], torso: 70, head: -6, arms: [{ angles: [8, 8], spread: [8, 4] }], legs: [footAt(112, 226, 11, 45)] };
        return [
          { pose: stand, dur: 0.45, cue: "Hands to the floor", rep: true },
          { pose: squat, dur: 0.15, ease: "linear", cue: "Jump your feet back" },
          { pose: kick, dur: 0.15 },
          { pose: plank, dur: 0.15, hold: 0.15, ease: "linear", cue: "Jump your feet in" },
          { pose: kick, dur: 0.15 },
          { pose: squat, dur: 0.35, cue: "Jump up, arms overhead" },
          { pose: jump, dur: 0.4, cue: "Land softly" },
        ];
      })(),
    },
  },
  {
    slug: "jumping-jack",
    name: "Jumping Jack",
    region: "Legs",
    primary: ["calves", "glutes"],
    secondary: ["side-delts", "adductors", "quads"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "The classic warm-up: jump the feet wide while the arms sweep overhead.",
    steps: [
      "Stand tall with feet together and arms by your sides.",
      "Jump your feet out a little wider than shoulder width while sweeping your arms out and overhead.",
      "Jump your feet back together as your arms come back down to your sides.",
      "Keep a steady rhythm, landing lightly on the balls of your feet.",
    ],
    tips: ["Keep a slight bend in your knees on every landing.", "Step one foot out at a time for a no-jump version."],
    mistakes: ["Landing flat-footed and heavy", "Letting the knees cave in", "Half-height arm swings"],
    breathing: "Breathe rhythmically — out on one jump, in on the next.",
    prescription: { sets: "3", reps: "30–60 s", rest: "30 s" },
    animation: {
      frames: (() => {
        const together: Pose = { hip: [160, 154], torso: 0, arms: [{ angles: [0, 2], spread: [10, 6] }], legs: [{ ik: { x: 162, y: 243, z: 10 }, pole: [1, 0, 0.15], foot: 12 }] };
        const air: Pose = { hip: [160, 146], torso: 0, arms: [{ angles: [0, 0], spread: [92, 96] }], legs: [{ ik: { x: 162, y: 236, z: 21 }, pole: [1, 0, 0.3], foot: 30 }] };
        const wide: Pose = { hip: [160, 157], torso: 0, arms: [{ angles: [0, 0], spread: [170, 185] }], legs: [{ ik: { x: 162, y: 243, z: 32 }, pole: [1, 0, 0.5], foot: 12 }] };
        return [
          { pose: together, dur: 0.2, cue: "Jump out, arms up", rep: true },
          { pose: air, dur: 0.18 },
          { pose: wide, dur: 0.2, cue: "Jump in, arms down" },
          { pose: air, dur: 0.18 },
        ];
      })(),
    },
  },
  {
    slug: "high-knees",
    name: "High Knees",
    region: "Legs",
    primary: ["quads", "calves"],
    secondary: ["abs", "glutes", "hamstrings"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Sprint on the spot, driving each knee up to hip height.",
    steps: [
      "Stand tall with feet hip-width apart and elbows bent at 90°.",
      "Drive one knee up to hip height while the opposite arm swings forward.",
      "Land on the ball of your foot and immediately drive the other knee up.",
      "Keep alternating quickly, staying tall and light on your feet.",
    ],
    tips: ["Pump your arms hard — they set the rhythm for your legs.", "Hold your palms out at hip height as a target for your knees."],
    mistakes: ["Leaning back", "Landing on the heels", "Knees only reaching halfway"],
    breathing: "Breathe quickly and rhythmically; don't hold your breath.",
    prescription: { sets: "3–4", reps: "20–40 s", rest: "30–45 s" },
    animation: {
      frames: (() => {
        const support: AngleLimb = { angles: [2, -2], foot: 25 };
        const knee: AngleLimb = { angles: [92, -8], foot: 25 };
        const fwd: AngleLimb = { angles: [45, 135], spread: [8, 0] };
        const back: AngleLimb = { angles: [-35, 55], spread: [8, 0] };
        const base = { hip: [160, 150] as [number, number], torso: 3, head: 0 };
        return [
          { pose: { ...base, arms: [back, fwd], legs: [knee, support] }, dur: 0.28, ease: "linear", cue: "Drive your knees up", rep: true },
          { pose: { ...base, arms: [fwd, back], legs: [support, knee] }, dur: 0.28, ease: "linear", rep: true },
        ];
      })(),
    },
  },
  {
    slug: "jump-rope",
    name: "Jump Rope",
    region: "Legs",
    primary: ["calves"],
    secondary: ["quads", "forearms", "front-delts", "abs"],
    equipment: ["Jump rope"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Skipping builds springy calves, coordination and serious cardio fitness.",
    steps: [
      "Hold a handle in each hand with the rope behind your heels, elbows close to your sides.",
      "Swing the rope overhead by turning your wrists, not your whole arms.",
      "Hop a few centimetres off the floor on the balls of your feet as the rope reaches your toes.",
      "Land softly with slightly bent knees and keep a steady rhythm.",
    ],
    tips: ["Size the rope so the handles reach your armpits when you stand on its middle.", "Small, quiet jumps last longer than big ones."],
    mistakes: ["Jumping too high", "Swinging the rope with the shoulders", "Landing on the heels"],
    breathing: "Breathe steadily through your nose and mouth; stay relaxed.",
    prescription: { sets: "3–5", reps: "45–90 s", rest: "45 s" },
    animation: {
      props: [{ type: "extra", kind: "core:jump-rope", params: { groundY: 151, airY: 141 } }],
      frames: (() => {
        const arms: [LimbSpec] = [hand(14, 57, 30, [-1, 0.3, 0.3])];
        return [
          { pose: { hip: [160, 151], torso: 2, arms, legs: [footAt(162, 240, 10, 30)] }, dur: 0.2, ease: "linear", cue: "Small, light hops", rep: true },
          { pose: { hip: [160, 141], torso: 2, arms, legs: [footAt(162, 230, 10, 42)] }, dur: 0.2, ease: "linear" },
        ];
      })(),
    },
  },
  {
    slug: "battle-ropes",
    name: "Battle Rope Waves",
    region: "Shoulders",
    primary: ["front-delts"],
    secondary: ["side-delts", "forearms", "abs", "upper-back", "quads", "glutes"],
    equipment: ["Battle ropes"],
    gear: ["battle-ropes"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Alternating waves that torch the shoulders and heart rate with zero impact on the joints.",
    steps: [
      "Hold one rope end in each hand and step back until there is a little slack.",
      "Sit into a half squat with your chest up and core braced.",
      "Raise one arm while lowering the other, fast, to send alternating waves down the ropes.",
      "Keep the waves travelling all the way to the anchor for the whole interval.",
    ],
    tips: ["Drive the movement from your shoulders and keep your elbows soft.", "Stay low — standing up drains the power from your waves."],
    mistakes: ["Standing up tall", "Tiny waves that die halfway", "Rounding the back"],
    breathing: "Breathe rhythmically with the waves; don't hold your breath.",
    prescription: { sets: "4–6", reps: "20–30 s", rest: "30–60 s" },
    animation: {
      props: [{ type: "extra", kind: "core:battle-ropes", params: { anchorX: 620 } }],
      frames: (() => {
        const up: LimbSpec = { ik: { x: 205, y: 140, z: 22 }, pole: [-0.5, 1, 0.6] };
        const down: LimbSpec = { ik: { x: 200, y: 172, z: 22 }, pole: [-0.5, 1, 0.6] };
        const base = { hip: [148, 183] as [number, number], torso: 22, head: -8, legs: [footAt(162, 245, 18, 0, [1, 0, 0.35])] as [LimbSpec] };
        return [
          { pose: { ...base, arms: [up, down] }, dur: 0.25, ease: "linear", cue: "Fast, alternating waves", rep: true },
          { pose: { ...base, arms: [down, up] }, dur: 0.25, ease: "linear", rep: true },
        ];
      })(),
    },
  },
  {
    slug: "medicine-ball-slam",
    name: "Medicine Ball Slam",
    region: "Core",
    primary: ["abs", "lats"],
    secondary: ["front-delts", "triceps", "glutes", "hamstrings"],
    equipment: ["Medicine ball"],
    gear: ["medicine-ball"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Plyometric",
    summary: "Lift the ball overhead and slam it into the floor — pure power and a great stress release.",
    steps: [
      "Stand with feet shoulder-width apart holding a slam ball at your chest.",
      "Reach the ball overhead, rising onto the balls of your feet.",
      "Brace your abs and slam the ball down hard just in front of your feet, following through with your hips.",
      "Squat down, pick up the ball with a flat back and go straight into the next rep.",
    ],
    tips: ["Use a no-bounce slam ball, not a rubber medicine ball that can rebound into your face.", "Throw the ball through the floor — full effort on every rep."],
    mistakes: ["Rounding the back to pick up the ball", "Slamming with the arms only", "Standing too close to the landing spot"],
    breathing: "Inhale as you reach up, exhale forcefully as you slam.",
    prescription: { sets: "3–4", reps: "10–15", rest: "60 s" },
    animation: {
      props: [MAT, { type: "extra", kind: "core:medicine-ball" }],
      frames: repFrames(
        { hip: [160, 154], torso: -4, head: -6, arms: [{ angles: [176, 178], spread: [2, -14] }], legs: [footAt(162, 245, 16, 8, [1, 0, 0.3])] },
        { hip: [134, 208], torso: 60, head: -14, arms: [{ angles: [8, 8], spread: [0, -12] }], legs: [footAt(162, 245, 16, 0, [1, 0, 0.3])] },
        { go: 0.35, back: 0.8, hold: 0.25, cues: ["Slam it down hard", "Pick it up and reach overhead"] },
      ),
    },
  },
  {
    slug: "farmers-walk",
    name: "Farmer's Walk",
    region: "Back",
    primary: ["forearms", "traps"],
    secondary: ["abs", "obliques", "upper-back", "glutes", "quads", "calves"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Walk with heavy weights at your sides to build grip, traps and a rock-solid trunk.",
    steps: [
      "Pick up a heavy dumbbell in each hand with a flat back, as in a deadlift.",
      "Stand tall with shoulders pulled back and down and arms straight by your sides.",
      "Walk forward with short, quick steps, keeping your torso upright.",
      "Walk for the set distance or time, then set the weights down with control.",
    ],
    tips: ["Grip the handles as hard as you can — it keeps the shoulders stable.", "Look straight ahead and keep your ribs stacked over your hips."],
    mistakes: ["Leaning to one side", "Shrugging the shoulders up to the ears", "Taking long, lurching strides"],
    breathing: "Brace your core and take short, steady breaths as you walk.",
    prescription: { sets: "3–4", reps: "30–40 m or 30–45 s", rest: "90 s" },
    animation: {
      props: [{ type: "dumbbell" }],
      frames: (() => {
        const hang = (a: number): AngleLimb => ({ angles: [a, a + 2], spread: [12, 6] });
        const strike: Pose = { hip: [160, 158], torso: 2, arms: [hang(-4), hang(4)], legs: [footAt(186, 244, 11, -12), footAt(134, 240, 11, 28)] };
        const pass: Pose = { hip: [160, 155], torso: 2, arms: [hang(1), hang(1)], legs: [footAt(160, 245, 11, 0), footAt(162, 228, 11, 8)] };
        const mirror = (p: Pose): Pose => ({ ...p, arms: [p.arms[1]!, p.arms[0]], legs: [p.legs[1]!, p.legs[0]] });
        return [
          { pose: strike, dur: 0.3, ease: "linear", cue: "Short, quick steps", rep: true },
          { pose: pass, dur: 0.3, ease: "linear" },
          { pose: mirror(strike), dur: 0.3, ease: "linear", cue: "Stand tall", rep: true },
          { pose: mirror(pass), dur: 0.3, ease: "linear" },
        ];
      })(),
    },
  },
  {
    slug: "bear-crawl",
    name: "Bear Crawl",
    region: "Core",
    primary: ["abs", "front-delts"],
    secondary: ["quads", "triceps", "chest", "obliques"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Crawl on hands and feet with your knees hovering — core, shoulders and conditioning in one.",
    steps: [
      "Start on all fours, hands under shoulders and knees under hips.",
      "Lift your knees a few centimetres off the floor, keeping your back flat.",
      "Step one hand and the opposite foot forward a short distance.",
      "Repeat with the other hand and foot, keeping your hips low and level.",
    ],
    tips: ["Take small steps — the smaller the step, the harder your core works.", "Imagine a glass of water balanced on your lower back."],
    mistakes: ["Hips shooting up high", "Knees dragging on the floor", "Moving the same-side hand and foot"],
    breathing: "Breathe steadily; keep your abs lightly braced.",
    prescription: { sets: "3–4", reps: "20–30 s or 10 m", rest: "45 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const handAt = (x: number, y: number): LimbSpec => ({ ik: { x, y, z: 21 }, pole: [-1, 0, 0.2] });
        const footOn = (x: number, y: number, tilt: number): LimbSpec => ({ ik: { x, y, z: 11 }, pole: [0.3, 1, 0], foot: tilt });
        const H = { front: handAt(214, 241), mid: handAt(202, 241), back: handAt(190, 241), swing: handAt(202, 231) };
        const F = { front: footOn(110, 231, 70), mid: footOn(98, 231, 70), back: footOn(86, 231, 70), swing: footOn(98, 222, 60) };
        type Phase = keyof typeof H;
        // Right hand + left foot move together, then the other pair.
        const pose = (a: Phase, b: Phase): Pose => ({ hip: [140, 192.5], torso: 82, head: -10, arms: [H[a], H[b]], legs: [F[b], F[a]] });
        const frames: Keyframe[] = [
          { pose: pose("front", "back"), dur: 0.3, ease: "linear", cue: "Opposite hand and foot", rep: true },
          { pose: pose("mid", "swing"), dur: 0.3, ease: "linear" },
          { pose: pose("back", "front"), dur: 0.3, ease: "linear", rep: true },
          { pose: pose("swing", "mid"), dur: 0.3, ease: "linear" },
        ];
        return frames;
      })(),
    },
  },
  {
    slug: "treadmill-run",
    name: "Treadmill Run",
    region: "Legs",
    primary: ["quads", "hamstrings", "calves"],
    secondary: ["glutes", "abs"],
    equipment: ["Machine"],
    gear: ["treadmill"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Steady running on the treadmill for heart health, endurance and calorie burn.",
    steps: [
      "Clip the safety key to your clothing and start the belt at a walking pace.",
      "Increase the speed gradually to an easy run you could hold a conversation at.",
      "Run tall in the middle of the belt with a slight forward lean, landing under your hips.",
      "Swing your arms forward and back with elbows bent at about 90°.",
      "Slow to a walk for a few minutes before stopping the belt.",
    ],
    tips: ["Set a 1% incline to better match running outdoors.", "Take short, quick steps rather than long, reaching strides."],
    mistakes: ["Holding on to the handrails", "Over-striding and landing on the heels", "Running too close to the console"],
    breathing: "Breathe rhythmically, for example in for two steps and out for two.",
    prescription: { sets: "1", reps: "20–40 min", rest: "—" },
    animation: {
      props: [{ type: "extra", kind: "core:treadmill", params: { x: 150 } }],
      frames: (() => {
        // The belt deck is 22 cm high, so a planted ankle sits at y ≈ 223.
        const fwd: AngleLimb = { angles: [35, 125], spread: [8, 0] };
        const mid: AngleLimb = { angles: [0, 90], spread: [8, 0] };
        const back: AngleLimb = { angles: [-40, 55], spread: [8, 0] };
        const strike: Pose = { hip: [160, 137.5], torso: 8, arms: [back, fwd], legs: [footAt(170, 222.8, 10, 5, [1, 0, 0.1]), footAt(122, 196, 10, 45, [1, 0, 0.1])] };
        const flight: Pose = { hip: [160, 133], torso: 8, arms: [mid, mid], legs: [footAt(128, 210, 10, 50, [1, 0, 0.1]), footAt(178, 198, 10, 10, [1, 0, 0.1])] };
        const mirror = (p: Pose): Pose => ({ ...p, arms: [p.arms[1]!, p.arms[0]], legs: [p.legs[1]!, p.legs[0]] });
        return [
          { pose: strike, dur: 0.17, ease: "linear", cue: "Land under your hips", rep: true },
          { pose: flight, dur: 0.17, ease: "linear" },
          { pose: mirror(strike), dur: 0.17, ease: "linear", cue: "Relaxed arm swing", rep: true },
          { pose: mirror(flight), dur: 0.17, ease: "linear" },
        ];
      })(),
    },
  },
  {
    slug: "rowing-machine-row",
    name: "Rowing Machine",
    region: "Back",
    primary: ["lats", "quads", "upper-back"],
    secondary: ["hamstrings", "glutes", "biceps", "rear-delts", "abs", "lower-back"],
    equipment: ["Machine"],
    gear: ["rowing-machine"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Low-impact, full-body cardio: push with the legs, swing the body, pull with the arms.",
    steps: [
      "Strap your feet in so the strap crosses the widest part of your foot, and grab the handle.",
      "Start at the catch: shins vertical, arms straight, body leaning slightly forward.",
      "Drive with your legs first, then swing your body back to about 11 o'clock.",
      "Finish by pulling the handle to your lower ribs, elbows past your body.",
      "Return in reverse order: arms away, body forward, then bend the knees and slide back to the catch.",
    ],
    tips: ["Think legs–body–arms on the drive and arms–body–legs on the recovery.", "The recovery should take about twice as long as the drive."],
    mistakes: ["Pulling with the arms before the legs have finished", "Bending the knees before the handle passes them", "Hunching the back at the catch"],
    breathing: "Exhale during the drive, inhale on the recovery.",
    prescription: { sets: "1", reps: "10–30 min or 500 m intervals", rest: "—" },
    animation: {
      props: [{ type: "extra", kind: "core:rower", params: { x: 168 } }],
      frames: (() => {
        const legs: [LimbSpec] = [{ ik: { x: 221, y: 221.3, z: 10 }, pole: [1, -1, 0.1], foot: -44 }];
        const hands = (x: number, y: number): [LimbSpec] => [{ ik: { x, y, z: 20 }, pole: [-1, 0.4, 0.6] }];
        return [
          { pose: { hip: [172, 194], torso: 30, head: -4, arms: hands(227, 194), legs }, dur: 0.5, ease: "linear", cue: "Drive with your legs", rep: true },
          { pose: { hip: [150, 194], torso: 22, head: -2, arms: hands(193, 190), legs }, dur: 0.4, ease: "linear", cue: "Swing back and pull" },
          { pose: { hip: [140, 194], torso: -22, head: 4, arms: hands(147, 160), legs }, dur: 0.45, hold: 0.1, ease: "linear", cue: "Arms away, body over" },
          { pose: { hip: [142, 194], torso: 20, head: -2, arms: hands(186, 190), legs }, dur: 0.7, ease: "linear", cue: "Slide forward slowly" },
        ];
      })(),
    },
  },
  {
    slug: "stationary-bike",
    name: "Stationary Bike",
    region: "Legs",
    primary: ["quads"],
    secondary: ["glutes", "hamstrings", "calves"],
    equipment: ["Machine"],
    gear: ["exercise-bike"],
    level: "Beginner",
    mechanics: "Compound",
    category: "Cardio",
    summary: "Joint-friendly cycling for warm-ups, steady cardio or hard intervals.",
    steps: [
      "Set the saddle so your knee is only slightly bent with the pedal at the bottom.",
      "Sit tall with a light grip on the handlebars and the balls of your feet on the pedals.",
      "Pedal in smooth circles, pushing down and pulling through the bottom of each stroke.",
      "Adjust the resistance so you can hold your target effort or cadence.",
    ],
    tips: ["Aim for 80–100 rpm for steady rides.", "Keep your hips still on the saddle — rocking means the resistance or saddle is off."],
    mistakes: ["Saddle too low, cramping the knees", "Pointing the toes hard at the bottom", "Leaning heavily on the handlebars"],
    breathing: "Breathe deeply and steadily; match your breathing to the effort.",
    prescription: { sets: "1", reps: "20–45 min", rest: "—" },
    animation: {
      props: [{ type: "extra", kind: "core:bike", params: { x: 175, scale: 0.92 } }],
      frames: (() => {
        // Pedals circle the bottom bracket (165.8, 220.6), radius 15.6 cm; the ankle sits behind and above the pedal axle.
        const pedal = (deg: number): LimbSpec => ({
          ik: { x: 165.8 + 15.6 * Math.sin(deg * DEG) - 9.3, y: 220.6 + 15.6 * Math.cos(deg * DEG) - 6.6, z: 11 },
          pole: [1, -0.3, 0.1],
          foot: 20,
        });
        const arms: [LimbSpec] = [{ ik: { x: 200, y: 146, z: 20 }, pole: [-0.3, 1, 0.6] }];
        return Array.from({ length: 8 }, (_, k): Keyframe => {
          const deg = 180 - 45 * k;
          return {
            pose: { hip: [147, 143.8], torso: 35, head: -10, arms, legs: [pedal(deg), pedal(deg + 180)] },
            dur: 0.13,
            ease: "linear",
            cue: k === 0 ? "Smooth circles" : undefined,
            rep: k === 0,
          };
        });
      })(),
    },
  },
];

// ─────────────────────────── MOBILITY ───────────────────────────

const MOBILITY: Exercise[] = [
  {
    slug: "cobra-stretch",
    name: "Cobra Stretch",
    region: "Core",
    primary: ["abs"],
    secondary: ["lower-back", "chest"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    category: "Mobility",
    summary: "A gentle back bend that stretches the abs and hip fronts and eases a stiff lower back.",
    steps: [
      "Lie face down with your hands under your shoulders and legs straight.",
      "Keep your hips and the tops of your feet on the floor.",
      "Slowly press your chest up by straightening your arms, only as far as feels comfortable.",
      "Hold for a few seconds with your shoulders down and away from your ears.",
      "Lower back down slowly.",
    ],
    tips: ["Keep a slight bend in your elbows.", "Relax your glutes and let the stretch spread along your spine."],
    mistakes: ["Lifting the hips off the floor", "Shrugging the shoulders", "Forcing the range into pain"],
    breathing: "Inhale as you press up, breathe slowly in the hold, exhale as you lower.",
    prescription: { sets: "2", reps: "5–8 slow reps", rest: "30 s" },
    animation: {
      props: [MAT],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 198, y: 244, z: 24 }, pole: [-1, -1, 0.3] }];
        const legs: [LimbSpec] = [{ angles: [-90, -90], foot: 170 }];
        return repFrames(
          { hip: [148, 238], torso: 88, head: -4, arms, legs },
          { hip: [148, 238], torso: 52, head: -12, arms, legs },
          { go: 1.5, back: 1.5, hold: 2, cues: ["Press your chest up slowly", "Lower with control"] },
        );
      })(),
    },
  },
  {
    slug: "childs-pose",
    name: "Child's Pose",
    region: "Back",
    primary: ["lower-back", "lats"],
    secondary: ["glutes", "upper-back"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    category: "Mobility",
    hold: true,
    summary: "A restful stretch for the back, lats and hips — ideal between sets or after training.",
    steps: [
      "Kneel with your big toes together and your knees wide apart.",
      "Sit your hips back toward your heels.",
      "Walk your hands forward and lower your chest between your knees.",
      "Rest your forehead on the floor and reach long through your fingertips.",
      "Breathe slowly and let your hips sink further back with each exhale.",
    ],
    tips: ["Walk your hands to one side to stretch the opposite lat.", "Put a cushion under your hips if they don't reach your heels."],
    mistakes: ["Holding your breath", "Tensing the shoulders up to the ears", "Forcing the hips down"],
    breathing: "Breathe slowly into your back ribs; sink a little deeper on each exhale.",
    prescription: { sets: "1–2", reps: "30–60 s hold", rest: "—" },
    animation: {
      props: [MAT],
      frames: (() => {
        const pose = (sink: number): Pose => ({
          hip: pelvisFor(104 - sink, 220 + sink * 0.5, 105),
          torso: 105,
          head: -25,
          arms: [{ ik: { x: 224, y: 244, z: 22 }, pole: [0, -1, 0.3] }],
          legs: [{ ik: { x: 97, y: 244, z: 8 }, pole: [1, 0.3, 1], foot: 180 }],
        });
        return [
          { pose: pose(0), dur: 2.5, cue: "Reach long and breathe", rep: true },
          { pose: pose(2), dur: 2.5, cue: "Sink your hips back" },
        ];
      })(),
    },
  },
  {
    slug: "kneeling-hip-flexor-stretch",
    name: "Kneeling Hip Flexor Stretch",
    region: "Legs",
    primary: ["quads"],
    secondary: ["glutes", "abs"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    category: "Mobility",
    hold: true,
    summary: "Opens up tight hip flexors from sitting all day — great before squats and lunges.",
    steps: [
      "Kneel on one knee with the other foot flat in front, both knees bent about 90°.",
      "Tuck your pelvis under by squeezing the glute of the kneeling leg.",
      "Shift your hips forward until you feel a stretch at the front of the back hip.",
      "Reach the arm on the kneeling side overhead to deepen the stretch.",
      "Hold, then switch sides.",
    ],
    tips: ["Pad the back knee with a folded mat.", "A small tuck of the pelvis matters more than a big lunge forward."],
    mistakes: ["Arching the lower back instead of tucking the pelvis", "Front knee collapsing inward", "Leaning the torso forward"],
    breathing: "Breathe slowly; ease a little deeper on each exhale.",
    prescription: { sets: "2", reps: "30–45 s each side", rest: "—" },
    animation: {
      props: [MAT],
      frames: (() => {
        const onHip: LimbSpec = { ik: { x: 3, y: -10, z: 21, rel: "pelvis" }, pole: [-1, 0, 1] };
        const reach: LimbSpec = { ik: { x: 2, y: -120, z: 12, rel: "pelvis" }, pole: [0, 1, 0.5] };
        const legs: [LimbSpec, LimbSpec] = [
          { ik: { x: 200, y: 245, z: 12 }, pole: [1, -0.2, 0.1], foot: 0 },
          { ik: { x: 78, y: 245, z: 11 }, pole: [0.2, 1, 0], foot: 180 },
        ];
        return [
          { pose: { hip: pelvisFor(132, 203, 0), torso: 0, arms: [onHip, onHip], legs }, dur: 1.5, cue: "Tuck your pelvis and shift forward", rep: true },
          { pose: { hip: pelvisFor(142, 206, -4), torso: -4, arms: [onHip, reach], legs }, dur: 1.5, hold: 2.5, cue: "Hold, then ease back" },
        ];
      })(),
    },
  },
  {
    slug: "standing-hamstring-stretch",
    name: "Standing Hamstring Stretch",
    region: "Legs",
    primary: ["hamstrings"],
    secondary: ["calves", "lower-back"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Isolation",
    category: "Mobility",
    hold: true,
    summary: "A simple standing stretch for the back of the thigh that you can do anywhere in the gym.",
    steps: [
      "Stand tall and step one foot forward, heel on the floor and toes pointing up.",
      "Bend your back knee slightly and keep the front leg straight.",
      "Hinge forward from your hips with a flat back until you feel a stretch behind the front thigh.",
      "Let your arms hang toward your front foot and hold.",
      "Stand back up and switch legs.",
    ],
    tips: ["Push your hips back rather than reaching down with your hands.", "Pull your toes toward you to add a calf stretch."],
    mistakes: ["Rounding the back to reach lower", "Bouncing in the stretch", "Locking the front knee hard"],
    breathing: "Breathe slowly and relax a little further on each exhale.",
    prescription: { sets: "2", reps: "30 s each leg", rest: "—" },
    animation: {
      frames: (() => {
        const legs: [LimbSpec, LimbSpec] = [
          { ik: { x: 188, y: 244, z: 11 }, pole: [1, -0.2, 0.1], foot: -30 },
          { ik: { x: 132, y: 245, z: 11 }, pole: [1, -0.2, 0.1], foot: 0 },
        ];
        return repFrames(
          { hip: [145, 172], torso: 5, head: 0, arms: [{ angles: [2, 4], spread: [9, 5] }], legs },
          { hip: [138, 175], torso: 60, head: -6, arms: [{ angles: [8, 8], spread: [6, 2] }], legs },
          { go: 1.6, back: 1.4, hold: 3, cues: ["Hinge forward, back flat", "Stand back up slowly"] },
        );
      })(),
    },
  },
  {
    slug: "doorway-chest-stretch",
    name: "Doorway Chest Stretch",
    region: "Chest",
    primary: ["chest"],
    secondary: ["front-delts", "biceps"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Isolation",
    category: "Mobility",
    hold: true,
    summary: "Uses a door frame to open up a tight chest and the fronts of the shoulders.",
    steps: [
      "Stand in a doorway and place your forearms on the frame, elbows at shoulder height and bent 90°.",
      "Step one foot forward through the doorway.",
      "Lean your body forward until you feel a stretch across your chest and the fronts of your shoulders.",
      "Hold, keeping your ribs down and your neck relaxed.",
    ],
    tips: ["Raise the elbows a little higher to stretch the lower chest fibres.", "Keep the stretch gentle — no pain or tingling in the arms."],
    mistakes: ["Arching the lower back", "Shrugging the shoulders", "Forcing the lean too far"],
    breathing: "Breathe slowly and let the chest open on each exhale.",
    prescription: { sets: "2", reps: "30–45 s hold", rest: "—" },
    animation: {
      props: [{ type: "extra", kind: "core:doorway", params: { x: 150, half: 44 } }],
      frames: (() => {
        const legs: [LimbSpec, LimbSpec] = [planted(182, 12), planted(128, 12)];
        return repFrames(
          { hip: [156, 160], torso: 0, arms: [{ angles: [-90, 180], spread: [88, 0] }], legs },
          { hip: [164, 163], torso: 2, arms: [{ angles: [-90, 180], spread: [70, 0] }], legs },
          { go: 1.5, back: 1.5, hold: 3, cues: ["Lean through the doorway", "Ease back"] },
        );
      })(),
    },
  },
];

// ─────────────────────────── export ───────────────────────────

export const CORE_CARDIO_EXERCISES: Exercise[] = [...CORE, ...CARDIO, ...MOBILITY];
