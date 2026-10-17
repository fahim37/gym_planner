import type { Animation, LimbSpec, Pose, Prop } from "@/lib/anatomy/types";
import type { Exercise } from "@/lib/exercise-types";
import { HIGH_PLANK, hand, lyingOnBack, planted, plankHands, repFrames, standing, straightLegBack } from "../poses";

const MAT: Prop = { type: "mat" };
const bricks = (shared = false, grip = "neutral"): Prop => ({
  type: "extra", kind: "core:bricks", params: { shared, grip },
});
const gripTip = "Use a clean, intact brick you can grip securely; wrap rough edges and keep the load light.";

/** Reuse established movement mechanics while giving home variants their own content and equipment. */
export function createHomeBrickExercises(library: Exercise[]): Exercise[] {
  const base = (slug: string): Exercise => {
    const exercise = library.find((e) => e.slug === slug);
    if (!exercise) throw new Error(`Missing home exercise template: ${slug}`);
    return exercise;
  };
  const variant = (source: string, overrides: Partial<Exercise> & Pick<Exercise, "slug" | "name">): Exercise => ({
    ...base(source), gear: undefined, variations: undefined, ...overrides,
  });
  const withBricks = (source: string, shared = false, grip = "neutral"): Animation => ({
    ...base(source).animation,
    props: [...(base(source).animation.props ?? []).filter((p) => p.type === "mat"), bricks(shared, grip)],
  });
  const inclineHands: LimbSpec = { ik: { x: 240, y: 173, z: 24 }, pole: [-0.6, -1, 0.5] };
  // Pin the ankles and rotate a straight leg + torso line around them.
  // An arbitrary hip position with a planted ankle makes the IK solver bend the knees.
  const incline = (torso: number): Pose => {
    const angle = torso * Math.PI / 180;
    return {
      hip: [97 + 91 * Math.sin(angle), 232 - 91 * Math.cos(angle)],
      torso, arms: [inclineHands], legs: [straightLegBack(-torso, 55)],
    };
  };
  const plank: Pose = {
    ...HIGH_PLANK, arms: [plankHands],
    legs: [straightLegBack(-72)],
  };
  const tap: LimbSpec = { ik: { x: 195, y: 187, z: -17 }, pole: [-0.2, 0.5, 1] };
  const floorArms: LimbSpec = { angles: [80, 92], spread: [15, 8] };

  return [
    variant("barbell-romanian-deadlift", {
      slug: "brick-romanian-deadlift", name: "Brick Romanian Deadlift (RDL)",
      level: "Beginner", equipment: ["Brick"],
      summary: "A light home hip hinge for the hamstrings and glutes using a brick in each hand.",
      steps: [
        "Stand with feet hip-width apart, holding a brick in each hand in front of your thighs.",
        "Soften your knees, brace your abdomen and keep your back long.",
        "Push your hips back and lower the bricks close to your legs.",
        "Stop when you feel your hamstrings stretch, before your back rounds.",
        "Push through your feet and stand tall without leaning back.",
      ],
      tips: [gripTip, "Keep the bricks close and use a slow, controlled lowering phase."],
      prescription: { sets: "2–3", reps: "10–12", rest: "60 s" },
      animation: {
        ...withBricks("barbell-romanian-deadlift"),
        frames: base("barbell-romanian-deadlift").animation.frames.map((frame, index) => ({
          ...frame, cue: index === 0 ? "Hips back, bricks close" : "Drive hips forward",
          pose: { ...frame.pose, arms: [hand(0, 56, 22, [-1, 0, 0.2])] },
        })),
      },
    }),
    variant("bent-over-dumbbell-row", {
      slug: "brick-bent-over-row", name: "Brick Bent-Over Rows", equipment: ["Brick"],
      summary: "Row two light bricks toward your hips to train the back and biceps at home.",
      steps: [
        "Hold a brick in each hand with palms facing inward and feet hip-width apart.",
        "Bend your knees slightly and hinge at the hips, keeping your spine long.",
        "Pull your elbows back, bringing the bricks toward your lower ribs.",
        "Pause briefly, then lower until your arms are straight without swinging your torso.",
      ],
      tips: [gripTip, "Keep your neck in line with your back and your shoulders away from your ears."],
      prescription: { sets: "2–3", reps: "10–12", rest: "60 s" },
      animation: withBricks("bent-over-dumbbell-row"),
    }),
    variant("push-up", {
      slug: "incline-push-up", name: "Incline Push-Ups", equipment: ["Bodyweight"],
      summary: "A hands-elevated push-up on a sturdy counter or bench for chest, shoulders and triceps.",
      steps: [
        "Place your hands slightly wider than shoulder-width on a fixed counter or sturdy bench.",
        "Walk your feet back until your body forms a straight line from head to heels.",
        "Bend your elbows about 30–45 degrees from your sides and lower your chest toward the surface.",
        "Press through your palms to return, keeping your abdomen and glutes engaged.",
      ],
      tips: ["Use a surface that cannot slide or tip.", "Choose a higher surface to make the movement easier."],
      mistakes: ["Hips sagging", "Elbows flaring sideways", "Using an unstable chair or stacked bricks"],
      prescription: { sets: "2–3", reps: "8–12", rest: "60 s" },
      animation: {
        props: [{ type: "box", from: 225, to: 275, top: 175, width: 90 }],
        frames: repFrames(incline(46), incline(58), {
          go: 1.5, back: 1, cues: ["Lower your chest toward the support", "Press up as one straight line"],
        }),
      },
    }),
    variant("leg-extension", {
      slug: "seated-knee-extension", name: "Seated Knee Extensions", equipment: ["Bodyweight"],
      summary: "Straighten one knee at a time from a sturdy seat to work the front of your thigh without a machine.",
      steps: [
        "Sit upright on a sturdy chair or bench with both feet on the floor.",
        "Keep your thigh on the seat and slowly straighten one knee through a comfortable range.",
        "Pause briefly while tightening the front of your thigh, without forcing the knee backward.",
        "Lower your foot slowly. Alternate legs and count the reps for each side.",
      ],
      tips: ["Keep your back upright and your thigh still.", "Begin without ankle weights and use a range that does not hurt."],
      mistakes: ["Swinging the foot upward", "Leaning backward to lift the leg", "Forcing the knee into a painful range"],
      breathing: "Exhale as you straighten your knee; inhale as you lower your foot.",
      prescription: { sets: "2", reps: "10–12 each leg", rest: "45 s" },
      animation: {
        props: [{ type: "box", from: 117, to: 190, top: 205, width: 55 }],
        frames: (() => {
          const bent: LimbSpec = { angles: [90, 0], foot: 0 };
          const extended: LimbSpec = { angles: [90, 88], foot: -75 };
          const seated = (legs: [LimbSpec, LimbSpec]): Pose => ({
            hip: [160, 197], torso: 0,
            arms: [hand(15, 53, 24, [-0.6, 1, 0.1])], legs,
          });
          return [
            { pose: seated([bent, bent]), dur: 1.1, cue: "Straighten one knee slowly", rep: true },
            { pose: seated([extended, bent]), dur: 1.3, hold: 0.7, cue: "Lower your foot with control" },
            { pose: seated([bent, bent]), dur: 1.1, cue: "Now straighten the other knee", rep: true },
            { pose: seated([bent, extended]), dur: 1.3, hold: 0.7, cue: "Keep your thigh on the seat" },
          ];
        })(),
      },
    }),
    variant("glute-bridge", {
      slug: "straight-leg-raise", name: "Straight Leg Raises",
      primary: ["quads"], secondary: ["abs"],
      summary: "Raise one straight leg while the other knee stays bent, keeping your pelvis and back steady.",
      steps: [
        "Lie on your back with one knee bent and its foot flat on the floor; keep the other leg straight.",
        "Tighten the front of the straight leg's thigh and gently brace your abdomen.",
        "Lift that leg about 20–25 cm without bending the knee or arching your back.",
        "Pause, then lower slowly. Alternate sides and count each leg separately.",
      ],
      tips: ["Keep your neck relaxed and your hips level.", "Make the lift smaller if your knee bends or your back starts to arch."],
      mistakes: ["Bending the working knee", "Lifting by arching the lower back", "Dropping the heel onto the floor"],
      breathing: "Exhale as you lift; inhale as you lower.",
      prescription: { sets: "2", reps: "10 each leg", rest: "45 s" },
      animation: {
        props: [MAT],
        frames: (() => {
          const down: LimbSpec = { angles: [90, 90], foot: -90 };
          const up: LimbSpec = { angles: [106, 106], foot: -74 };
          const bent: LimbSpec = { angles: [135, 45], foot: 0 };
          const pose = (legs: [LimbSpec, LimbSpec]): Pose => ({
            ...lyingOnBack(239, -90, [floorArms]), legs,
          });
          return [
            { pose: pose([down, bent]), dur: 1.1, cue: "Lift with your knee straight", rep: true },
            { pose: pose([up, bent]), dur: 1.5, hold: 0.5, cue: "Lower slowly, hips still" },
            { pose: pose([down, bent]), dur: 0.8, cue: "Bend this knee and straighten the other leg" },
            { pose: pose([bent, down]), dur: 1.1, cue: "Switch to the other leg", rep: true },
            { pose: pose([bent, up]), dur: 1.5, hold: 0.5, cue: "Keep your back relaxed on the floor" },
            { pose: pose([bent, down]), dur: 0.8, cue: "Return and switch sides" },
          ];
        })(),
      },
    }),
    variant("standing-dumbbell-calf-raise", {
      slug: "bodyweight-calf-raise", name: "Calf Raises", equipment: ["Bodyweight"],
      summary: "Rise onto the balls of both feet to train your calves using bodyweight.",
      steps: [
        "Stand with feet hip-width apart and your weight spread evenly over both feet.",
        "Use a fixed counter or wall for balance if needed.",
        "Slowly raise both heels, keeping your weight over the balls of your feet.",
        "Pause at the top, then lower your heels gently to the floor.",
      ],
      tips: ["Keep your knees straight without locking them.", "Use a flat floor to start and avoid bouncing."],
      mistakes: ["Bouncing to lift the heels", "Rolling onto the outer edges of the feet", "Leaning forward instead of rising vertically"],
      prescription: { sets: "2", reps: "12–15", rest: "45 s" },
      animation: { ...base("standing-dumbbell-calf-raise").animation, props: [] },
    }),
    variant("barbell-back-squat", {
      slug: "partial-bodyweight-squat", name: "Partial Bodyweight Squats", equipment: ["Bodyweight"], level: "Beginner",
      summary: "A shallow bodyweight squat with a comfortable range of motion; an alternative to wall sits.",
      steps: [
        "Stand with feet about shoulder-width apart, toes turned slightly outward.",
        "Reach your arms forward and brace your abdomen.",
        "Bend at the hips and knees, sitting back only as far as is comfortable and pain-free.",
        "Keep your heels down and knees following the direction of your toes.",
        "Push through your whole feet to return to standing.",
      ],
      tips: ["Use a fixed counter for balance if needed.", "Choose a comfortable depth; a partial squat is not guaranteed safe for every knee condition."],
      mistakes: ["Forcing depth through pain", "Knees collapsing inward", "Heels lifting"],
      breathing: "Inhale as you lower; exhale as you stand.",
      prescription: { sets: "2", reps: "8–12", rest: "60 s" },
      variations: [{ slug: "wall-sit", note: "Prefer a static hold? Use a comfortable wall-sit depth instead." }],
      animation: {
        frames: repFrames(
          standing({ arms: [{ angles: [80, 85] }] }),
          { hip: [145, 177], torso: 18, arms: [{ angles: [80, 85] }], legs: [planted(162, 16)] },
          { cues: ["Sit back into a comfortable shallow squat", "Push through your feet to stand"] },
        ),
      },
    }),
    variant("dumbbell-alternate-biceps-curl", {
      slug: "brick-biceps-curl", name: "Brick Bicep Curls", equipment: ["Brick"],
      summary: "Controlled alternating curls using light bricks to work your biceps and grip.",
      steps: [
        "Stand tall with a brick securely held in each hand and palms facing forward.",
        "Keep your elbows close to your ribs and your wrists straight.",
        "Curl one brick toward your shoulder without moving your upper arm.",
        "Lower slowly, then repeat with the other arm. Count each arm separately.",
      ],
      tips: [gripTip, "Keep your torso still; stop the set before your grip starts to slip."],
      prescription: { sets: "2", reps: "10–12 each arm", rest: "60 s" },
      animation: withBricks("dumbbell-alternate-biceps-curl", false, "underhand"),
    }),
    variant("dumbbell-standing-triceps-extension", {
      slug: "overhead-brick-triceps-extension", name: "Overhead Brick Triceps Extension", equipment: ["Brick"],
      summary: "A two-hand overhead extension with one light brick to train the triceps.",
      steps: [
        "Test a secure two-hand grip on a clean, intact, light brick at chest height.",
        "Raise it overhead with both hands, bracing your abdomen and keeping your ribs down.",
        "Bend your elbows to lower the brick behind your head only through a comfortable range.",
        "Keep your upper arms mostly still and extend your elbows to return overhead.",
      ],
      tips: ["Use both hands throughout; skip the loaded version if the grip feels uncertain.", "Move slowly and stop if your shoulders or elbows hurt."],
      mistakes: ["Using a loose or crumbling brick", "Arching the lower back", "Letting the elbows flare or the brick slip"],
      prescription: { sets: "2", reps: "10–12", rest: "60 s" },
      animation: withBricks("dumbbell-standing-triceps-extension", true),
    }),
    variant("forearm-plank", {
      slug: "plank-shoulder-tap", name: "Plank with Shoulder Tap", hold: false,
      summary: "Alternating shoulder taps from a high plank train your core to resist rotation.",
      steps: [
        "Start in a high plank with hands under shoulders and feet wider than hip-width.",
        "Brace your abdomen and keep your hips level.",
        "Lift one hand and gently tap the opposite shoulder, then return it to the floor.",
        "Repeat with the other hand. Each tap counts as one rep.",
      ],
      tips: ["Move slowly and widen your feet to reduce rocking.", "Lower your knees to the floor if needed."],
      mistakes: ["Rotating the hips with each tap", "Sagging through the lower back", "Rushing the hand changes"],
      breathing: "Breathe steadily; exhale gently on each tap.",
      prescription: { sets: "2", reps: "12–20 total taps", rest: "45 s" },
      animation: {
        props: [MAT],
        frames: [
          { pose: plank, dur: 0.7, cue: "Tap the opposite shoulder", rep: true },
          { pose: { ...plank, arms: [tap, plankHands] }, dur: 0.7, hold: 0.15, cue: "Return your hand" },
          { pose: plank, dur: 0.7, cue: "Switch hands", rep: true },
          { pose: { ...plank, arms: [plankHands, tap] }, dur: 0.7, hold: 0.15, cue: "Keep your hips still" },
        ],
      },
    }),
    variant("russian-twist", {
      slug: "brick-russian-twist", name: "Russian Twists (with Brick)", equipment: ["Brick"], level: "Beginner",
      summary: "A controlled seated twist holding one light brick with both hands and heels on the floor.",
      steps: [
        "Sit with knees bent, heels on the floor and one light brick held securely in both hands.",
        "Lean back slightly while keeping a long spine and braced abdomen.",
        "Turn your ribcage a small, comfortable amount to bring the brick toward one hip.",
        "Return through the middle, then turn the other way. Each side counts as one rep.",
      ],
      tips: [gripTip, "Keep your heels down and use a small twist; try it without weight first."],
      mistakes: ["Rounding the lower back", "Swinging the brick quickly", "Forcing rotation through back pain"],
      prescription: { sets: "2", reps: "16–20 total", rest: "45 s" },
      animation: {
        ...withBricks("russian-twist", true),
        frames: base("russian-twist").animation.frames.map((frame) => ({
          ...frame,
          pose: { ...frame.pose, legs: [{ ik: { x: 210, y: 245, z: 12 }, pole: [0.3, -1, 0.1] }] },
        })),
      },
    }),
    variant("lying-leg-raise", {
      slug: "bent-knee-leg-raise", name: "Leg Raises (Knee Bent)",
      summary: "A shorter-lever floor leg raise with bent knees for controlled core work.",
      steps: [
        "Lie on your back, arms by your sides and knees bent about 90 degrees.",
        "Brace gently and raise your bent legs until your thighs are above your hips.",
        "Lower both bent legs slowly, keeping your lower back comfortably against the floor.",
        "Stop before your back arches; tap your feet down between reps if needed.",
      ],
      tips: ["Keep the knee bend throughout the movement.", "Shorten the lowering range if you lose control of your back."],
      mistakes: ["Arching the lower back", "Straightening the legs too early", "Dropping the feet quickly"],
      prescription: { sets: "2", reps: "8–12", rest: "45 s" },
      animation: {
        props: [MAT],
        frames: repFrames(
          { ...lyingOnBack(239, -90, [floorArms]), legs: [{ angles: [125, 35], foot: -35 }] },
          { ...lyingOnBack(239, -90, [floorArms]), legs: [{ angles: [180, 90], foot: -80 }] },
          { go: 1.2, back: 1.8, cues: ["Lift with knees bent", "Lower only while your back stays controlled"] },
        ),
      },
    }),
  ];
}
