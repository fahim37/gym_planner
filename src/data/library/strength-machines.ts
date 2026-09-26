import type { IkLimb, LimbSpec, Pose } from "@/lib/anatomy/types";
import type { Exercise } from "@/lib/exercise-types";
import { ANKLE_Y, armsDown, hand, handLocal, lyingOnBack, planted, repFrames, STAND_Y } from "../poses";

/*
 * Heavy barbell lifts and selectorized machines: the staples of a commercial gym
 * that the other libraries don't cover. Machine props live in
 * src/lib/three/extra-props/machines.ts (kinds prefixed "machine:").
 */

/** A flat foot planted on the floor (keeps `foot: 0` so tilted keyframes blend back). */
const flat = (x: number, width = 11, pole: [number, number, number] = [1, 0, 0.12]): IkLimb => ({ ...planted(x, width, pole), foot: 0 });

/** A foot at an arbitrary point, with its tilt. */
const foot = (x: number, y: number, z: number, pole: [number, number, number], tilt = 0): IkLimb => ({ ik: { x, y, z }, pole, foot: tilt });

/** Seated on a machine seat (top at y = 200), feet flat on the floor in front. */
const seatedLegs = (x = 184): LimbSpec => ({ ik: { x, y: ANKLE_Y, z: 14 }, pole: [1, -1, 0.1], foot: 0 });

/** Bar on the upper back (squats, lunges). */
const backBar: LimbSpec = handLocal(-8, -2, 40, [-0.4, 1, 0.5]);

// ─────────────────────────────── Barbell ───────────────────────────────

const BARBELL: Exercise[] = [
  {
    slug: "decline-barbell-bench-press",
    name: "Decline Barbell Bench Press",
    region: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front-delts"],
    equipment: ["Barbell", "Bench"],
    gear: ["barbell", "adjustable-bench"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "Bench press on a head-down bench: puts the lower chest to work and lets you move heavy weight with less shoulder stress.",
    steps: [
      "Hook your legs under the pads and lie back on the decline bench, eyes under the bar.",
      "Grip the bar a little wider than shoulder width and unrack it over your lower chest.",
      "Lower the bar under control to the bottom of your chest.",
      "Press it straight back up until your arms are locked out.",
    ],
    tips: ["Use a spotter — racking is awkward from a decline.", "Keep your shoulder blades pinched together."],
    mistakes: ["Bouncing the bar off the chest", "Flaring the elbows straight out", "Lowering to the neck"],
    breathing: "Inhale as you lower, exhale as you press.",
    prescription: { sets: "3–4", reps: "6–10", rest: "2 min" },
    animation: {
      props: [
        { type: "bench", from: 150, to: 205, top: 196, incline: { at: 150, length: 88, angle: -15 } },
        { type: "barbell" },
      ],
      frames: (() => {
        const legs: [LimbSpec] = [foot(205, 216, 13, [0.4, -1, 0.1], 45)];
        const at = (arms: LimbSpec): Pose => ({ hip: [165, 184], torso: -103, arms: [arms], legs });
        return repFrames(
          at(hand(2, -56, 30, [0.2, 1, 0.8])),
          at(hand(6, -13, 32, [0.3, 1, 0.8])),
          { go: 1.4, back: 0.9, cues: ["Lower to your lower chest", "Press up"] },
        );
      })(),
    },
  },
  {
    slug: "barbell-shrug",
    name: "Barbell Shrug",
    region: "Back",
    primary: ["traps"],
    secondary: ["forearms"],
    equipment: ["Barbell"],
    gear: ["barbell", "power-rack"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Heavy shrugs for thick upper traps and a strong grip.",
    steps: [
      "Hold a barbell in front of your thighs with a shoulder-width overhand grip.",
      "Stand tall with straight arms and a braced core.",
      "Lift your shoulders straight up towards your ears as high as you can.",
      "Squeeze for a second, then lower slowly to a full stretch.",
    ],
    tips: ["Go straight up and down — no rolling.", "Use straps only when your grip gives out before your traps."],
    mistakes: ["Bending the elbows to lift the bar", "Rolling the shoulders", "Tiny, bouncy reps"],
    breathing: "Exhale as you shrug, inhale as you lower.",
    prescription: { sets: "3–4", reps: "10–15", rest: "60–90 s" },
    animation: {
      props: [{ type: "barbell" }],
      frames: (() => {
        const at = (shrug: number): Pose => ({ hip: [162, STAND_Y], torso: 2, shrug, arms: [{ angles: [6, 6], spread: [5, 2] }], legs: [planted(162, 12)] });
        return repFrames(at(0), at(6), { go: 0.7, back: 1.1, hold: 0.8, cues: ["Shoulders to your ears", "Lower to a full stretch"] });
      })(),
    },
  },
  {
    slug: "dumbbell-shrug",
    name: "Dumbbell Shrug",
    region: "Back",
    primary: ["traps"],
    secondary: ["forearms"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Shrugs with the weights at your sides — a longer, more natural path than a barbell.",
    steps: [
      "Stand tall holding a heavy dumbbell in each hand at your sides, palms facing in.",
      "Keep your arms straight and your chest up.",
      "Lift your shoulders straight up towards your ears.",
      "Pause at the top, then lower slowly to a full stretch.",
    ],
    tips: ["Think \"ears to shoulders\" is wrong — bring shoulders to ears.", "Pause at the top for a real contraction."],
    mistakes: ["Bending the elbows", "Rolling the shoulders forward", "Jutting the head forward"],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3–4", reps: "12–15", rest: "60 s" },
    animation: {
      props: [{ type: "dumbbell", grip: "neutral" }],
      frames: (() => {
        const at = (shrug: number): Pose => ({ hip: [160, STAND_Y], torso: 0, shrug, arms: [armsDown], legs: [planted(162, 12)] });
        return repFrames(at(0), at(6), { go: 0.7, back: 1.1, hold: 0.8, cues: ["Shoulders straight up", "Lower slowly"] });
      })(),
    },
  },
  {
    slug: "pendlay-row",
    name: "Pendlay Row",
    region: "Back",
    primary: ["lats", "upper-back"],
    secondary: ["rear-delts", "biceps", "lower-back"],
    equipment: ["Barbell"],
    gear: ["barbell"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "An explosive, strict barbell row from a dead stop on the floor, torso parallel to the ground.",
    steps: [
      "Set up over the bar with a flat back, torso close to parallel with the floor.",
      "Grip just wider than shoulder width with straight arms.",
      "Row the bar explosively to your lower chest without lifting your torso.",
      "Lower it back to the floor and let it settle before the next rep.",
    ],
    tips: ["Every rep starts from the floor — that's what makes it a Pendlay.", "Keep your hips and back still."],
    mistakes: ["Standing up as you pull", "Rounding the lower back", "Bouncing the bar off the floor"],
    breathing: "Breathe in at the floor, exhale as you row.",
    prescription: { sets: "4", reps: "5–8", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "barbell" }],
      frames: (() => {
        const legs: [LimbSpec] = [planted(165, 13, [1, 0, 0.3])];
        const at = (arms: LimbSpec): Pose => ({ hip: [138, 178], torso: 80, head: -16, arms: [arms], legs });
        return repFrames(
          at(hand(2, 60, 24, [-1, 0, 0.3])),
          at(hand(-20, 22, 25, [-0.5, -1, 0.35])),
          { go: 0.5, back: 0.9, hold: 0.4, cues: ["Explode to your chest", "Back to the floor"] },
        );
      })(),
    },
  },
  {
    slug: "rack-pull",
    name: "Rack Pull",
    region: "Back",
    primary: ["upper-back", "glutes", "lower-back"],
    secondary: ["traps", "hamstrings", "forearms"],
    equipment: ["Barbell"],
    gear: ["barbell", "power-rack"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "A deadlift from the safety pins at knee height — overloads the lockout, upper back and grip.",
    steps: [
      "Set the pins so the bar sits just below your knees.",
      "Hinge to the bar with a flat back, shins close, and grip just outside your legs.",
      "Drive your hips forward and stand up tall, pulling your shoulders back.",
      "Lower the bar back to the pins under control.",
    ],
    tips: ["Squeeze the glutes hard at the top.", "Great for building your top-end deadlift."],
    mistakes: ["Leaning back at lockout", "Rounding the back", "Dropping the bar on the pins"],
    breathing: "Brace before each pull, exhale at the top.",
    prescription: { sets: "3–4", reps: "4–6", rest: "2–3 min" },
    animation: {
      props: [
        { type: "barbell" },
        ...[1, -1].flatMap((s) => [
          { type: "box" as const, from: 146, to: 194, top: 204, bottom: 212, width: 6, z: s * 62 },
          { type: "box" as const, from: 140, to: 146, top: 40, width: 6, z: s * 62 },
          { type: "box" as const, from: 194, to: 200, top: 40, width: 6, z: s * 62 },
        ]),
      ],
      frames: (() => {
        const legs: [LimbSpec] = [planted(160, 13, [1, 0, 0.3])];
        const knee: Pose = { hip: [140, 172], torso: 40, head: -12, arms: [{ ik: { x: 169, y: 181, z: 24 }, pole: [-1, 0, 0.2] }], legs };
        const top: Pose = { hip: [162, STAND_Y], torso: -2, arms: [{ ik: { x: 164, y: 151, z: 24 }, pole: [-1, 0, 0.2] }], legs };
        return repFrames(knee, top, { go: 0.8, back: 1.1, hold: 0.5, cues: ["Hips through, stand tall", "Lower to the pins"] });
      })(),
    },
  },
  {
    slug: "landmine-press",
    name: "Landmine Press",
    region: "Shoulders",
    primary: ["front-delts", "chest"],
    secondary: ["triceps", "side-delts", "abs"],
    equipment: ["Landmine", "Barbell"],
    gear: ["landmine", "barbell"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Press the end of an anchored bar up and forward — a shoulder-friendly alternative to overhead pressing.",
    steps: [
      "Stand facing the landmine, holding the end of the bar at your chest with both hands.",
      "Brace your core and squeeze your glutes.",
      "Press the bar up and forward until your arms are straight.",
      "Lower it back to your chest with control.",
    ],
    tips: ["Lean in slightly so the press follows the bar's arc.", "Try it one arm at a time too."],
    mistakes: ["Arching the lower back", "Shrugging at the top", "Letting the bar crash down"],
    breathing: "Exhale as you press, inhale as you lower.",
    prescription: { sets: "3", reps: "8–12", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "upper:landmine", params: { x: 300 } }],
      frames: (() => {
        const legs: [LimbSpec, LimbSpec] = [flat(172, 12), flat(140, 12)];
        const at = (arms: LimbSpec): Pose => ({ hip: [154, STAND_Y + 1], torso: 12, arms: [arms], legs });
        return repFrames(
          at(hand(16, 4, 6, [0, 1, 0.8])),
          at(hand(46, -32, 5, [0.2, 0.4, 1])),
          { go: 0.9, back: 1.2, hold: 0.2, cues: ["Press up and forward", "Back to your chest"] },
        );
      })(),
    },
  },
  {
    slug: "power-clean",
    name: "Power Clean",
    region: "Legs",
    primary: ["glutes", "hamstrings", "traps"],
    secondary: ["quads", "upper-back", "calves", "front-delts"],
    equipment: ["Barbell"],
    gear: ["barbell", "weight-plates"],
    level: "Advanced",
    mechanics: "Compound",
    category: "Plyometric",
    summary: "The classic explosive lift: pull the bar from the floor and catch it on your shoulders in one fast movement.",
    steps: [
      "Set up like a deadlift: bar over mid-foot, flat back, arms straight.",
      "Push the floor away and pass the bar over your knees, keeping it close.",
      "At mid-thigh, explode: extend hips, knees and ankles and shrug hard.",
      "Pull yourself under and catch the bar on your shoulders with elbows high, in a quarter squat.",
      "Stand up tall, then lower the bar back down.",
    ],
    tips: ["Learn it light with a coach first.", "Speed matters more than weight here."],
    mistakes: ["Pulling early with the arms", "Letting the bar swing away", "Catching with elbows down"],
    breathing: "Brace at the floor; breathe between reps.",
    prescription: { sets: "5", reps: "2–3", rest: "2 min" },
    animation: {
      camera: "side",
      props: [{ type: "barbell" }],
      frames: (() => {
        const legs: [LimbSpec] = [planted(160, 13, [1, 0, 0.3])];
        const rack = (x: number, y: number): LimbSpec => ({ ik: { x, y, z: 24 }, pole: [1, 0.2, 0.4] });
        const floor: Pose = { hip: [128, 196], torso: 58, head: -20, arms: [{ ik: { x: 170, y: 223, z: 24 }, pole: [-1, 0, 0.2] }], legs };
        const knee: Pose = { hip: [140, 172], torso: 40, head: -12, arms: [{ ik: { x: 169, y: 181, z: 24 }, pole: [-1, 0, 0.2] }], legs };
        const extend: Pose = {
          hip: [160, 149],
          torso: -6,
          shrug: 6,
          arms: [{ ik: { x: 166, y: 138, z: 24 }, pole: [-1, -0.2, 0.3] }],
          legs: [foot(160, 236, 13, [1, 0, 0.3], 38)],
        };
        const catchPose: Pose = { hip: [150, 176], torso: 10, head: -4, arms: [rack(173, 112)], legs };
        const stand: Pose = { hip: [160, STAND_Y], torso: 0, arms: [rack(172, 91)], legs };
        return [
          { pose: floor, dur: 0.7, hold: 0.4, cue: "Push the floor away", rep: true },
          { pose: knee, dur: 0.3 },
          { pose: extend, dur: 0.25, cue: "Explode and shrug" },
          { pose: catchPose, dur: 0.6, hold: 0.3, cue: "Catch it, elbows high" },
          { pose: stand, dur: 0.9, hold: 0.4, cue: "Lower the bar" },
          { pose: knee, dur: 0.9 },
        ];
      })(),
    },
  },
  {
    slug: "barbell-reverse-lunge",
    name: "Barbell Reverse Lunge",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "adductors", "calves"],
    equipment: ["Barbell"],
    gear: ["barbell", "power-rack"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "Step back into a lunge with a barbell on your back — heavy single-leg work that's easy on the knees.",
    steps: [
      "Unrack the bar onto your upper back and stand with feet hip-width.",
      "Step one foot back and lower until both knees are bent about 90°.",
      "Drive through the front heel to bring the back foot in.",
      "Alternate legs each rep.",
    ],
    tips: ["Keep your torso upright.", "A longer step works the glutes more."],
    mistakes: ["Front knee caving in", "Slamming the back knee down", "Leaning forward"],
    breathing: "Inhale on the way down, exhale as you stand up.",
    prescription: { sets: "3", reps: "8 each leg", rest: "90 s" },
    animation: {
      camera: "front",
      props: [{ type: "barbell", at: "back" }],
      frames: (() => {
        const stand: Pose = { hip: [160, STAND_Y], torso: 0, arms: [backBar], legs: [flat(161)] };
        const stepA: Pose = { hip: [150, 164], torso: 3, arms: [backBar], legs: [flat(161), foot(128, 230, 11, [0.2, 1, 0], 25)] };
        const lowA: Pose = { hip: [120, 198], torso: 6, arms: [backBar], legs: [flat(161, 11, [1, -0.1, 0.1]), foot(82, 236, 10, [0.2, 1, 0], 50)] };
        const swap = (p: Pose): Pose => ({ ...p, legs: [p.legs[1]!, p.legs[0]] });
        return [
          { pose: stepA, dur: 0.6, cue: "Step back" },
          { pose: lowA, dur: 0.7, hold: 0.2, cue: "Drive through the front heel" },
          { pose: stepA, dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Other leg", rep: true },
          { pose: swap(stepA), dur: 0.6 },
          { pose: swap(lowA), dur: 0.7, hold: 0.2, cue: "Drive through the front heel" },
          { pose: swap(stepA), dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Step back", rep: true },
        ];
      })(),
    },
  },
];

// ─────────────────────────────── Machines ───────────────────────────────

const MACHINES: Exercise[] = [
  {
    slug: "machine-chest-press",
    name: "Machine Chest Press",
    region: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front-delts"],
    equipment: ["Machine"],
    gear: ["chest-press-machine"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A seated press on a fixed path — the safest way to push your chest hard without a spotter.",
    steps: [
      "Set the seat so the handles line up with the middle of your chest.",
      "Sit with your back flat on the pad and grip the handles.",
      "Press forward until your arms are straight, without locking hard.",
      "Let the handles come back slowly until you feel a stretch across your chest.",
    ],
    tips: ["Keep your shoulder blades back on the pad.", "Great for finishing sets to failure safely."],
    mistakes: ["Shoulders rolling forward at the end", "Letting the stack slam", "Seat too high or low"],
    breathing: "Exhale as you press, inhale on the way back.",
    prescription: { sets: "3", reps: "10–12", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "machine:lever", params: { padX: 118, pivotX: 128, pivotY: 45, stackX: 72, style: "neutral" } }],
      frames: (() => {
        const at = (arms: LimbSpec): Pose => ({ hip: [132, 191], torso: -4, arms: [arms], legs: [seatedLegs()] });
        return repFrames(
          at(hand(10, 9, 25, [-1, 0.3, 0.8])),
          at(hand(52, 10, 22, [-0.2, 1, 0.8])),
          { go: 0.9, back: 1.4, hold: 0.2, cues: ["Press forward", "Slow stretch back"] },
        );
      })(),
    },
  },
  {
    slug: "machine-shoulder-press",
    name: "Machine Shoulder Press",
    region: "Shoulders",
    primary: ["front-delts", "side-delts"],
    secondary: ["triceps", "traps"],
    equipment: ["Machine"],
    gear: ["shoulder-press-machine"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Seated overhead pressing on a guided path — build the shoulders without balancing a bar.",
    steps: [
      "Set the seat so the handles start at shoulder height.",
      "Sit with your back on the pad and grip the handles.",
      "Press straight up until your arms are extended.",
      "Lower slowly until the handles are back at your shoulders.",
    ],
    tips: ["Keep your ribs down — don't arch off the pad.", "Control the lowering for more growth."],
    mistakes: ["Arching the lower back", "Half reps", "Shrugging the shoulders up"],
    breathing: "Exhale as you press, inhale as you lower.",
    prescription: { sets: "3", reps: "8–12", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "machine:lever", params: { padX: 118, padTop: 80, pivotX: 102, pivotY: 185, pivotZ: 34, stackX: 70, style: "neutral" } }],
      frames: (() => {
        const at = (arms: LimbSpec): Pose => ({ hip: [132, 191], torso: -4, arms: [arms], legs: [seatedLegs()] });
        return repFrames(
          at(hand(8, 2, 30, [0.1, 1, 0.9])),
          at(hand(6, -52, 26, [0.2, 0.3, 1])),
          { go: 0.9, back: 1.3, hold: 0.2, cues: ["Press up", "Back to your shoulders"] },
        );
      })(),
    },
  },
  {
    slug: "machine-row",
    name: "Seated Machine Row",
    region: "Back",
    primary: ["lats", "upper-back"],
    secondary: ["rear-delts", "biceps"],
    equipment: ["Machine"],
    gear: ["seated-cable-row"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Chest-supported rowing on a lever machine: all back, no lower-back strain.",
    steps: [
      "Set the seat so the handles are at chest height and rest your chest on the pad.",
      "Reach forward and grab the handles with straight arms.",
      "Row the handles back, driving your elbows behind you and squeezing your shoulder blades.",
      "Let your arms straighten slowly and feel your upper back stretch.",
    ],
    tips: ["Keep your chest on the pad the whole time.", "Pause for a second with the handles in."],
    mistakes: ["Leaning back off the pad", "Shrugging instead of rowing", "Rushing the return"],
    breathing: "Exhale as you row, inhale as you reach forward.",
    prescription: { sets: "3", reps: "10–12", rest: "90 s" },
    animation: {
      camera: "back",
      props: [
        {
          type: "extra",
          kind: "machine:lever",
          params: { pad: "chest", padX: 152, padTop: 112, padBottom: 162, pivotX: 205, pivotY: 90, stackX: 245, style: "neutral" },
        },
      ],
      frames: (() => {
        const at = (arms: LimbSpec): Pose => ({ hip: [132, 191], torso: 8, arms: [arms], legs: [seatedLegs(182)] });
        return repFrames(
          at(hand(50, 10, 20, [0, 1, 0.3])),
          at(hand(6, 16, 22, [-1, 0.3, 0.3])),
          { go: 0.9, back: 1.4, hold: 0.4, cues: ["Elbows back, squeeze", "Reach forward slowly"] },
        );
      })(),
    },
  },
  {
    slug: "smith-machine-bench-press",
    name: "Smith Machine Bench Press",
    region: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front-delts"],
    equipment: ["Machine", "Barbell", "Bench"],
    gear: ["smith-machine", "flat-bench"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Bench press with the bar on fixed rails — you can push to failure safely with the safety hooks.",
    steps: [
      "Set a flat bench under the Smith bar so it lines up with your mid-chest.",
      "Grip slightly wider than shoulder width and twist the bar off its hooks.",
      "Lower the bar to your chest under control.",
      "Press it back up, then twist it back onto the hooks when you're done.",
    ],
    tips: ["Set the safety stops just below chest height.", "Keep your feet planted and back tight."],
    mistakes: ["Bench in the wrong spot (bar lands on your neck)", "Bouncing off the chest", "Flaring the elbows"],
    breathing: "Inhale as you lower, exhale as you press.",
    prescription: { sets: "3–4", reps: "8–12", rest: "90 s" },
    animation: {
      props: [
        { type: "bench", from: 56, to: 190, top: 200 },
        { type: "extra", kind: "machine:smith-bench", params: { x: 106 } },
      ],
      frames: repFrames(
        lyingOnBack(190, -90, [{ ik: { x: 106, y: 134, z: 30 }, pole: [0.2, 1, 0.8] }]),
        lyingOnBack(190, -90, [{ ik: { x: 106, y: 176, z: 32 }, pole: [0.3, 1, 0.8] }]),
        { go: 1.4, back: 0.9, cues: ["Lower to your chest", "Press up"] },
      ),
    },
  },
  {
    slug: "seated-leg-curl",
    name: "Seated Leg Curl",
    region: "Legs",
    primary: ["hamstrings"],
    secondary: ["calves"],
    equipment: ["Machine"],
    gear: ["seated-leg-curl"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Seated hamstring curls — the hip-flexed position stretches the hamstrings for more growth than lying curls.",
    steps: [
      "Sit with your knees lined up with the machine's pivot and the pad on your lower calves.",
      "Lock the thigh pad down on top of your knees and hold the side handles.",
      "Curl your heels down and back as far as you can.",
      "Let your legs straighten slowly.",
    ],
    tips: ["Lean slightly forward for an even bigger stretch.", "Point your toes up (dorsiflex) to recruit more hamstring."],
    mistakes: ["Knees not lined up with the pivot", "Lifting the hips off the seat", "Letting the weight snap back"],
    breathing: "Exhale as you curl, inhale as you straighten.",
    prescription: { sets: "3", reps: "10–15", rest: "60 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "machine:seated-leg-curl" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 140, y: 184, z: 27 }, pole: [-0.5, 0.3, 1] }];
        return repFrames(
          { hip: [135, 191], torso: -8, arms, legs: [{ angles: [88, 80], foot: -60 }] },
          { hip: [135, 191], torso: -8, arms, legs: [{ angles: [88, -12], foot: 20 }] },
          { go: 0.9, back: 1.6, hold: 0.3, cues: ["Curl your heels back", "Straighten slowly"] },
        );
      })(),
    },
  },
  {
    slug: "hip-abduction-machine",
    name: "Hip Abduction Machine",
    region: "Legs",
    primary: ["glutes"],
    secondary: [],
    equipment: ["Machine"],
    gear: ["hip-abduction"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Push your knees apart against the pads to build the side glutes that steady your hips.",
    steps: [
      "Sit with your back on the pad and the pads on the outside of your knees.",
      "Hold the handles and keep your feet on the rests.",
      "Push your knees out as wide as you can.",
      "Pause, then let them come back together slowly.",
    ],
    tips: ["Lean forward slightly to hit more of the upper glutes.", "Control the return — don't let the stack slam."],
    mistakes: ["Bouncing through the range", "Using momentum", "Too heavy to reach full width"],
    breathing: "Exhale as you push out, inhale as you return.",
    prescription: { sets: "3", reps: "12–20", rest: "60 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "machine:hip", params: { side: "out" } }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 138, y: 183, z: 28 }, pole: [-0.5, 0.3, 1] }];
        const at = (spread: number): Pose => ({ hip: [135, 191], torso: -10, arms, legs: [{ angles: [86, 4], spread: [spread, spread * 0.35], foot: 0 }] });
        return repFrames(at(3), at(34), { go: 0.8, back: 1.3, hold: 0.5, cues: ["Knees out wide", "Return slowly"] });
      })(),
    },
  },
  {
    slug: "hip-adduction-machine",
    name: "Hip Adduction Machine",
    region: "Legs",
    primary: ["adductors"],
    secondary: ["glutes"],
    equipment: ["Machine"],
    gear: ["hip-abduction"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Squeeze your knees together against the pads to strengthen the inner thighs.",
    steps: [
      "Sit with the pads on the inside of your knees, legs spread as wide as is comfortable.",
      "Hold the handles and sit tall against the back pad.",
      "Squeeze your knees together until the pads nearly touch.",
      "Open back out slowly.",
    ],
    tips: ["Start with a range you can control and widen it over time.", "Squeeze for a second at the middle."],
    mistakes: ["Starting too wide and straining the groin", "Letting the weight yank your legs open", "Rushing"],
    breathing: "Exhale as you squeeze, inhale as you open.",
    prescription: { sets: "3", reps: "12–20", rest: "60 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "machine:hip", params: { side: "in" } }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 138, y: 183, z: 28 }, pole: [-0.5, 0.3, 1] }];
        const at = (spread: number): Pose => ({ hip: [135, 191], torso: -10, arms, legs: [{ angles: [86, 4], spread: [spread, spread * 0.35], foot: 0 }] });
        return repFrames(at(32), at(4), { go: 0.8, back: 1.3, hold: 0.5, cues: ["Squeeze your knees together", "Open slowly"] });
      })(),
    },
  },
  {
    slug: "assisted-pull-up",
    name: "Assisted Pull-Up",
    region: "Back",
    primary: ["lats"],
    secondary: ["biceps", "upper-back", "rear-delts"],
    equipment: ["Machine"],
    gear: ["assisted-pull-up"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Pull-ups with a counterweighted knee pad taking some of your bodyweight — the way to build up to your first strict pull-up.",
    steps: [
      "Pick the assistance weight (more weight = more help) and kneel on the pad.",
      "Grip the handles wide, arms straight.",
      "Pull your chest up towards the handles, driving your elbows down.",
      "Lower all the way to straight arms.",
    ],
    tips: ["Reduce the assistance a little every week or two.", "Full range beats more reps."],
    mistakes: ["Half reps", "Kicking off the pad", "Shrugging at the bottom"],
    breathing: "Exhale as you pull up, inhale as you lower.",
    prescription: { sets: "3", reps: "8–12", rest: "90 s" },
    animation: {
      props: [{ type: "extra", kind: "machine:assisted-pull-up", params: { barX: 165, barY: 25 } }],
      frames: repFrames(
        { hip: [167, 143], torso: -5, arms: [{ ik: { x: 165, y: 25, z: 36 }, pole: [0.2, 1, 0.7] }], legs: [{ angles: [6, -88], footFollowsShin: true }] },
        {
          hip: [171, 96],
          torso: -12,
          head: -12,
          arms: [{ ik: { x: 165, y: 25, z: 36 }, pole: [0.2, 1, 0.7] }],
          legs: [{ angles: [8, -86], footFollowsShin: true }],
        },
        { go: 1, back: 1.5, hold: 0.3, cues: ["Chest to the handles", "Lower to straight arms"] },
      ),
    },
  },
  {
    slug: "cable-glute-kickback",
    name: "Cable Glute Kickback",
    region: "Legs",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["Cable"],
    gear: ["cable-machine"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Kick one leg back against a low cable to isolate the glutes.",
    steps: [
      "Strap an ankle cuff to a low pulley and face the machine, holding the frame.",
      "Lean forward slightly and brace your core.",
      "Kick the working leg straight back, squeezing your glute at the top.",
      "Return slowly without letting the weight stack touch down.",
    ],
    tips: ["Move from the hip, not the lower back.", "A slight bend in the knee is fine."],
    mistakes: ["Arching the lower back to kick higher", "Swinging", "Turning the hips open"],
    breathing: "Exhale as you kick back, inhale as you return.",
    prescription: { sets: "3", reps: "12–15 each leg", rest: "45 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "machine:ankle-cable", params: { x: 215 } }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 219, y: 136, z: 26 }, pole: [-0.3, 1, 0.6] }];
        const at = (thigh: number, shin: number): Pose => ({
          hip: [160, 154],
          torso: 22,
          arms,
          legs: [{ angles: [thigh, shin], foot: 20 }, flat(163, 11)],
        });
        return repFrames(at(4, 8), at(-38, -30), { go: 0.8, back: 1.2, hold: 0.4, cues: ["Kick back, squeeze", "Return slowly"] });
      })(),
    },
  },
];

export const STRENGTH_MACHINE_EXERCISES: Exercise[] = [...BARBELL, ...MACHINES];
