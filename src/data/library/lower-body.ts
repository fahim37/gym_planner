import type { IkLimb, LimbSpec, Pose } from "@/lib/anatomy/types";
import type { Exercise } from "@/lib/exercise-types";
import { ANKLE_Y, armsDown, hand, handLocal, lyingOnBack, planted, repFrames, standing, STAND_Y } from "../poses";

/**
 * A flat foot planted on the floor. Always carries `foot: 0` so keyframes that
 * tilt the foot (toes, balls of the feet) interpolate back smoothly.
 */
const flat = (x: number, width = 11, pole: [number, number, number] = [1, 0, 0.12]): IkLimb => ({ ...planted(x, width, pole), foot: 0 });

/** A foot at an arbitrary point (on a box, in the air), with its tilt. */
const foot = (x: number, y: number, z: number, pole: [number, number, number], tilt = 0): IkLimb => ({ ik: { x, y, z }, pole, foot: tilt });

/** Cross-arm front rack: forearms crossed in front of the bar, hands on top of it, elbows up. */
const frontRackArms: [LimbSpec, LimbSpec] = [handLocal(16, 1, -9, [1, -0.3, 0.4]), handLocal(13, -3, -9, [1, -0.3, 0.4])];

/** Goblet hold: hands cupping a vertical dumbbell under the chin, elbows down. */
const gobletArms: LimbSpec = handLocal(13, 12, 7, [0.3, 1, 0.1]);

export const LOWER_BODY_EXERCISES: Exercise[] = [
  // ───────────────────────────── SQUATS ─────────────────────────────
  {
    slug: "barbell-front-squat",
    name: "Barbell Front Squat",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["abs", "upper-back", "adductors", "lower-back"],
    equipment: ["Barbell"],
    gear: ["barbell", "power-rack"],
    level: "Advanced",
    mechanics: "Compound",
    summary: "A squat with the bar on the front of your shoulders — more quads, more upright torso, less lower-back stress.",
    steps: [
      "Set the bar in a rack at upper-chest height and step under it so it sits on the front of your shoulders, touching your throat.",
      "Cross your arms and rest each hand on top of the bar at the opposite shoulder (or use a clean grip), elbows up and forward.",
      "Step back, feet shoulder-width apart with toes turned slightly out.",
      "Brace and sit straight down between your heels, keeping your elbows high and chest up.",
      "Descend until your thighs are at least parallel, then drive up through your whole foot.",
    ],
    tips: [
      "The bar rests on your shoulders, not in your hands — your hands only stop it rolling.",
      "Think “elbows to the ceiling” out of the bottom to stop the bar rolling forward.",
      "Heeled lifting shoes make it much easier to stay upright.",
    ],
    mistakes: ["Elbows dropping so the chest folds forward", "Heels lifting off the floor", "Holding the bar in the palms and straining the wrists"],
    breathing: "Big breath into your belly at the top, hold it down and through the sticking point, exhale near lockout.",
    prescription: { sets: "3–5", reps: "4–8", rest: "2–3 min" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:front-rack" }],
      frames: repFrames(
        { hip: [157, STAND_Y], torso: 3, arms: frontRackArms, legs: [flat(163, 15, [1, -0.1, 0.3])] },
        { hip: [132, 213], torso: 26, head: -14, arms: frontRackArms, legs: [flat(163, 15, [1, -0.1, 0.3])] },
        { go: 1.4, cues: ["Sit straight down, elbows high", "Drive up, elbows to the ceiling"] },
      ),
    },
  },
  {
    slug: "goblet-squat",
    name: "Goblet Squat",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["adductors", "abs", "upper-back"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "The easiest way to learn a deep, upright squat — the weight in front balances you.",
    steps: [
      "Hold one dumbbell vertically against your chest, cupping the top end with both hands.",
      "Stand with feet a little wider than shoulder width, toes turned out slightly.",
      "Brace, then sit down between your heels, keeping your chest tall and elbows pointing down.",
      "Go as deep as you can with a flat back — ideally your elbows brush the inside of your knees.",
      "Drive through your whole foot to stand, squeezing your glutes at the top.",
    ],
    tips: ["Keep the dumbbell touching your chest the whole time.", "Use your elbows to gently push your knees out at the bottom."],
    mistakes: ["Letting the weight drift away from the body", "Rounding the upper back", "Knees caving inward on the way up"],
    breathing: "Inhale and brace before you descend, exhale as you stand up.",
    prescription: { sets: "3", reps: "8–15", rest: "90 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:held-dumbbell" }],
      frames: repFrames(
        { hip: [158, STAND_Y], torso: 3, arms: [gobletArms], legs: [flat(163, 16, [1, -0.1, 0.4])] },
        { hip: [130, 216], torso: 24, head: -12, arms: [gobletArms], legs: [flat(163, 16, [1, -0.1, 0.4])] },
        { go: 1.3, cues: ["Sit down between your heels", "Drive up tall"] },
      ),
    },
  },
  {
    slug: "bodyweight-squat",
    name: "Bodyweight Squat",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "adductors", "abs"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "The foundation of every squat — builds leg endurance and mobility with no equipment.",
    steps: [
      "Stand with feet shoulder-width apart, toes turned out slightly, arms by your sides.",
      "Push your hips back and bend your knees, raising your arms in front of you for balance.",
      "Keep your chest up and your knees tracking over your toes.",
      "Sit down until your thighs are at least parallel to the floor.",
      "Push through your whole foot to stand tall and lower your arms.",
    ],
    tips: ["Keep your weight spread over the whole foot — heel, big toe and little toe.", "Slow three-second descents make it much harder without adding weight."],
    mistakes: ["Heels lifting", "Knees caving inward", "Only going a quarter of the way down"],
    breathing: "Inhale on the way down, exhale on the way up.",
    prescription: { sets: "3", reps: "15–25", rest: "60 s" },
    animation: {
      camera: "front",
      frames: repFrames(
        standing({ hip: [159, STAND_Y], torso: 2, legs: [flat(163, 15, [1, -0.1, 0.3])] }),
        { hip: [127, 212], torso: 36, head: -16, arms: [{ angles: [86, 88], spread: [8, 4] }], legs: [flat(163, 15, [1, -0.1, 0.3])] },
        { go: 1.2, cues: ["Sit back, arms forward", "Stand tall"] },
      ),
    },
  },
  {
    slug: "dumbbell-sumo-squat",
    name: "Dumbbell Sumo Squat",
    region: "Legs",
    primary: ["glutes", "adductors", "quads"],
    secondary: ["hamstrings", "abs"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A wide-stance squat that shifts the work toward the glutes and inner thighs.",
    steps: [
      "Stand with feet wide — about 1.5 times shoulder width — and toes turned out 30–45°.",
      "Hold one dumbbell by the top end with both hands, arms long, so it hangs between your legs.",
      "Keep your chest up and sit straight down, pushing your knees out over your toes.",
      "Lower until your thighs are parallel or the dumbbell nearly touches the floor.",
      "Drive through your heels and squeeze your glutes to stand.",
    ],
    tips: ["Your torso stays much more upright than in a normal squat.", "Stand on two low plates or steps to lower the dumbbell further."],
    mistakes: ["Knees collapsing inward past the toes", "Leaning forward and turning it into a deadlift", "Stance so wide the knees can't track the toes"],
    breathing: "Inhale as you lower, exhale as you drive up.",
    prescription: { sets: "3", reps: "10–15", rest: "90 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:held-dumbbell", params: { mode: "hang" } }],
      frames: (() => {
        const legs: [LimbSpec] = [foot(164, ANKLE_Y, 32, [0.8, -0.1, 0.55])];
        const arms: [LimbSpec] = [{ ik: { x: 170, y: 150, z: 4 }, pole: [-1, 0, 0.6] }];
        const top: Pose = { hip: [160, 161], torso: 4, arms, legs };
        const bottom: Pose = { hip: [152, 205], torso: 14, head: -10, arms: [{ ik: { x: 168, y: 196, z: 4 }, pole: [-1, 0, 0.6] }], legs };
        return repFrames(top, bottom, { go: 1.3, cues: ["Sit straight down, knees out", "Drive up and squeeze"] });
      })(),
    },
  },

  // ─────────────────────────── PLYOMETRICS ───────────────────────────
  {
    slug: "jump-squat",
    name: "Jump Squat",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["calves", "hamstrings", "abs"],
    equipment: ["Bodyweight"],
    level: "Intermediate",
    mechanics: "Compound",
    category: "Plyometric",
    summary: "An explosive squat that trains power and gets your heart rate up fast.",
    steps: [
      "Stand with feet shoulder-width apart, arms by your sides.",
      "Dip quickly into a half squat, swinging your arms back.",
      "Explode up through your whole foot, swinging your arms forward and up, and leave the floor.",
      "Land softly on the balls of your feet, then heels, bending your knees and hips to absorb the impact.",
      "Reset your stance and go straight into the next rep.",
    ],
    tips: ["Aim for height, not speed — stop the set when your jumps get lower.", "Land as quietly as you can; noisy landings mean stiff knees."],
    mistakes: ["Landing with straight, locked knees", "Knees caving inward on take-off or landing", "Rushing reps with a shallow dip"],
    breathing: "Exhale sharply as you jump, inhale as you land and reset.",
    prescription: { sets: "3–4", reps: "6–10", rest: "90 s" },
    animation: {
      camera: "front",
      frames: (() => {
        const feet = flat(163, 14, [1, -0.1, 0.3]);
        const toes = (x: number, y: number, tilt: number) => foot(x, y, 14, [1, 0, 0.2], tilt);
        return [
          { pose: standing({ hip: [159, STAND_Y], legs: [feet] }), dur: 0.55, cue: "Dip and swing your arms back", rep: true },
          { pose: { hip: [132, 203], torso: 34, head: -12, arms: [{ angles: [-40, -32], spread: [8, 4] }], legs: [feet] }, dur: 0.22, hold: 0.05, cue: "Explode up" },
          { pose: { hip: [160, 150], torso: 4, arms: [{ angles: [120, 130], spread: [8, 4] }], legs: [toes(165, 236, 50)] }, dur: 0.22 },
          { pose: { hip: [161, 128], torso: 2, arms: [{ angles: [150, 160], spread: [10, 6] }], legs: [toes(166, 215, 55)] }, dur: 0.25, cue: "Land softly" },
          { pose: { hip: [140, 185], torso: 24, head: -8, arms: [{ angles: [60, 70], spread: [8, 4] }], legs: [feet] }, dur: 0.6, cue: "Absorb, then reset" },
        ];
      })(),
    },
  },
  {
    slug: "box-jump",
    name: "Box Jump",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["calves", "hamstrings", "abs"],
    equipment: ["Plyo box"],
    gear: ["plyo-box"],
    level: "Intermediate",
    mechanics: "Compound",
    category: "Plyometric",
    summary: "Jump onto a box to build explosive leg power while keeping landings low-impact.",
    steps: [
      "Stand a short step away from a sturdy box, feet hip-width apart.",
      "Swing your arms back and dip into a quarter squat.",
      "Drive your arms forward and jump, pulling your knees up to clear the edge.",
      "Land softly with your whole foot on the box in a half squat, knees tracking your toes.",
      "Stand up tall on the box, then step down one foot at a time — don't jump down.",
    ],
    tips: ["Pick a box you can land on in a half squat, not a deep one — height comes from the jump, not the tuck.", "Reset fully between reps; every jump should be a max-quality effort."],
    mistakes: ["Choosing a box so high you land in a deep squat", "Jumping back down and jarring the knees and Achilles", "Knees collapsing inward on landing"],
    breathing: "Exhale as you jump, breathe normally while you stand and step down.",
    prescription: { sets: "3–5", reps: "3–6", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:plyo-box", params: { from: 195, to: 245, top: 200, width: 60 } }],
      frames: (() => {
        const floor = (x: number) => flat(x, 12, [1, -0.1, 0.25]);
        const onBox = foot(208, 195, 12, [1, -0.1, 0.25]);
        const air = (x: number, y: number, tilt: number) => foot(x, y, 12, [1, -0.3, 0.2], tilt);
        return [
          { pose: standing({ hip: [154, STAND_Y], legs: [floor(156)] }), dur: 0.6, cue: "Swing back and dip", rep: true },
          { pose: { hip: [128, 196], torso: 42, head: -14, arms: [{ angles: [-45, -38], spread: [8, 4] }], legs: [floor(156)] }, dur: 0.25, hold: 0.05, cue: "Jump onto the box" },
          { pose: { hip: [157, 148], torso: 10, arms: [{ angles: [100, 110], spread: [8, 4] }], legs: [air(160, 236, 50)] }, dur: 0.2 },
          { pose: { hip: [176, 120], torso: 20, arms: [{ angles: [95, 100], spread: [8, 4] }], legs: [air(184, 178, 20)] }, dur: 0.25 },
          { pose: { hip: [186, 138], torso: 30, head: -10, arms: [{ angles: [70, 80], spread: [8, 4] }], legs: [onBox] }, dur: 0.6, hold: 0.15, cue: "Stand tall" },
          { pose: { hip: [205, 107], torso: 0, arms: [armsDown], legs: [onBox] }, dur: 0.5, hold: 0.2, cue: "Step down one foot at a time" },
          { pose: { hip: [200, 114], torso: 6, arms: [armsDown], legs: [onBox, air(177, 188, 12)] }, dur: 0.55 },
          { pose: { hip: [179, 162], torso: 20, arms: [{ angles: [30, 40], spread: [8, 4] }], legs: [onBox, floor(156)] }, dur: 0.5 },
          { pose: { hip: [162, 158], torso: 8, arms: [armsDown], legs: [air(179, 186, 15), floor(156)] }, dur: 0.5 },
        ];
      })(),
    },
  },

  // ───────────────────────────── LUNGES ─────────────────────────────
  {
    slug: "dumbbell-step-up",
    name: "Dumbbell Step-Up",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "adductors", "calves"],
    equipment: ["Dumbbell", "Plyo box"],
    gear: ["dumbbells", "plyo-box"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A simple single-leg exercise that builds strong quads and glutes and carries over to stairs and sport.",
    steps: [
      "Hold a dumbbell in each hand and stand facing a box or bench about knee height.",
      "Place your whole working foot on the box.",
      "Lean slightly forward and drive through the heel on the box to stand up tall on top.",
      "Bring the trailing foot up beside it, then step it back down to the floor under control.",
      "Keep the working foot on the box for all reps, then switch legs.",
    ],
    tips: ["Let the top leg do the work — don't bounce off the bottom foot.", "A lower box is fine; control matters more than height."],
    mistakes: ["Pushing off the floor with the back foot", "Front knee caving inward", "Dropping down fast instead of lowering"],
    breathing: "Exhale as you step up, inhale as you lower.",
    prescription: { sets: "3", reps: "8–12 each leg", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:plyo-box", params: { from: 184, to: 234, top: 205, width: 55 } }, { type: "dumbbell" }],
      frames: (() => {
        const lead = foot(198, 200, 11, [1, -0.2, 0.15]);
        const swing = (x: number, y: number, tilt: number) => foot(x, y, 11, [1, -0.3, 0.1], tilt);
        return [
          { pose: { hip: [160, 166], torso: 14, arms: [armsDown], legs: [lead, flat(138, 11, [1, 0, 0.1])] }, dur: 0.8, cue: "Drive through the top foot", rep: true },
          { pose: { hip: [185, 128], torso: 6, arms: [armsDown], legs: [lead, swing(166, 170, 10)] }, dur: 0.5 },
          { pose: { hip: [196, 112], torso: 2, arms: [armsDown], legs: [lead, foot(196, 200, 11, [1, -0.2, 0.15])] }, dur: 0.6, hold: 0.2, cue: "Step back down slowly" },
          { pose: { hip: [186, 124], torso: 6, arms: [armsDown], legs: [lead, swing(170, 180, 10)] }, dur: 0.8 },
        ];
      })(),
    },
  },
  {
    slug: "dumbbell-reverse-lunge",
    name: "Dumbbell Reverse Lunge",
    region: "Legs",
    primary: ["glutes", "quads"],
    secondary: ["hamstrings", "adductors", "calves"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Stepping back instead of forward keeps the front knee happy and puts more work into the glutes.",
    steps: [
      "Stand tall with a dumbbell in each hand at your sides, feet hip-width apart.",
      "Take a long step backward with one foot, landing on the ball of that foot.",
      "Lower straight down until your back knee is just above the floor and your front shin is roughly vertical.",
      "Drive through the heel of your front foot to bring the back leg forward to standing.",
      "Alternate legs each rep.",
    ],
    tips: ["Keep most of your weight on the front foot.", "A slight forward lean of the torso brings the glutes in more."],
    mistakes: ["Stepping back too short so the front knee shoots forward", "Back knee slamming into the floor", "Front knee caving inward"],
    breathing: "Inhale as you step back and lower, exhale as you drive up.",
    prescription: { sets: "3", reps: "8–12 each leg", rest: "90 s" },
    animation: {
      camera: "front",
      props: [{ type: "dumbbell" }],
      frames: (() => {
        const stand = standing({ legs: [flat(161)] });
        const stepA: Pose = { hip: [150, 164], torso: 3, arms: [armsDown], legs: [flat(161), foot(128, 230, 11, [0.2, 1, 0], 25)] };
        const lowA: Pose = {
          hip: [120, 198],
          torso: 6,
          arms: [armsDown],
          legs: [flat(161, 11, [1, -0.1, 0.1]), foot(82, 236, 10, [0.2, 1, 0], 50)],
        };
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
  {
    slug: "curtsy-lunge",
    name: "Curtsy Lunge",
    region: "Legs",
    primary: ["glutes", "quads"],
    secondary: ["adductors", "hamstrings"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A lunge that crosses the back leg behind you, adding extra work for the side glutes and inner thighs.",
    steps: [
      "Stand tall with feet hip-width apart and hands together at your chest or on your hips.",
      "Step one foot back and across behind the other, as if curtsying.",
      "Keep your hips and shoulders facing forward and lower until your front thigh is near parallel.",
      "Drive through the front heel to return to standing.",
      "Alternate sides each rep.",
    ],
    tips: ["Keep your front knee in line with your front foot, not drifting inward.", "Step back far enough that you can drop straight down."],
    mistakes: ["Twisting the hips to face sideways", "Front knee caving inward", "Leaning the torso over the front leg"],
    breathing: "Inhale as you lower, exhale as you return.",
    prescription: { sets: "3", reps: "10–12 each side", rest: "60 s" },
    animation: {
      camera: "front",
      frames: (() => {
        const arms: [LimbSpec] = [handLocal(22, 18, 6, [-0.3, 1, 0.8])];
        const stand: Pose = { hip: [160, STAND_Y], torso: 0, arms, legs: [flat(161)] };
        const stepA: Pose = { hip: [152, 166], torso: 3, arms, legs: [flat(161), foot(132, 230, -4, [0.2, 1, -0.2], 25)] };
        const lowA: Pose = {
          hip: [136, 197],
          torso: 8,
          arms,
          legs: [flat(161, 11, [1, -0.1, 0.05]), foot(108, 236, -24, [0.2, 1, -0.3], 50)],
        };
        const swap = (p: Pose): Pose => ({ ...p, legs: [p.legs[1]!, p.legs[0]] });
        return [
          { pose: stepA, dur: 0.6, cue: "Step back and across" },
          { pose: lowA, dur: 0.7, hold: 0.2, cue: "Drive back up" },
          { pose: stepA, dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Other side", rep: true },
          { pose: swap(stepA), dur: 0.6 },
          { pose: swap(lowA), dur: 0.7, hold: 0.2, cue: "Drive back up" },
          { pose: swap(stepA), dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Step back and across", rep: true },
        ];
      })(),
    },
  },

  {
    slug: "dumbbell-walking-lunge",
    name: "Dumbbell Walking Lunge",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "adductors", "calves", "abs"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "Lunges that travel across the floor — builds legs, balance and work capacity in one go.",
    steps: [
      "Stand tall with a dumbbell in each hand at your sides.",
      "Take a long step forward and lower until your back knee is just above the floor.",
      "Drive through the front heel to stand, bringing the back leg through into the next step.",
      "Keep alternating legs as you walk forward, torso upright.",
      "To return, turn around and lunge back — or step backward into each lunge as shown.",
    ],
    tips: ["Take steps long enough that your front shin stays roughly vertical.", "Pause briefly when you stand up if your balance gets shaky."],
    mistakes: ["Short, choppy steps that push the front knee far forward", "Back knee slamming into the floor", "Leaning the torso forward to fall into each step"],
    breathing: "Inhale as you step and lower, exhale as you drive up.",
    prescription: { sets: "3", reps: "10–12 steps each leg", rest: "90 s" },
    animation: {
      camera: "front",
      props: [{ type: "dumbbell" }],
      frames: (() => {
        // Two walking lunges forward (stepping through), then the same steps in reverse
        // (backward lunges) to return to the start, so the loop never slides a planted foot.
        const x0 = 70;
        const stand = (x: number): Pose => ({ hip: [x, STAND_Y], torso: 0, arms: [armsDown], legs: [flat(x + 2), flat(x + 2)] });
        const step = (x: number, lead: LimbSpec, back: LimbSpec): Pose => ({ hip: [x, 162], torso: 3, arms: [armsDown], legs: [lead, back] });
        const low = (x: number, front: LimbSpec, back: LimbSpec): Pose => ({ hip: [x, 196], torso: 4, arms: [armsDown], legs: [front, back] });
        const swing = (x: number) => foot(x, 226, 11, [1, -0.3, 0.1], 20);
        const ball = (x: number) => foot(x, 234.7, 10, [0.2, 1, 0], 50);
        const f = [
          stand(x0),
          step(x0 + 8, swing(x0 + 30), flat(x0 + 2)),
          low(x0 + 45, flat(x0 + 92, 11, [1, -0.1, 0.1]), ball(x0 + 7.7)),
          step(x0 + 80, flat(x0 + 92, 11, [1, -0.1, 0.1]), swing(x0 + 76)),
          low(x0 + 135, ball(x0 + 97.7), flat(x0 + 182, 11, [1, -0.1, 0.1])),
          step(x0 + 170, swing(x0 + 166), flat(x0 + 182, 11, [1, -0.1, 0.1])),
          stand(x0 + 180),
        ];
        return [
          { pose: f[1], dur: 0.6, cue: "Step forward into a lunge" },
          { pose: f[2], dur: 0.6, hold: 0.2, cue: "Drive up and step through", rep: true },
          { pose: f[3], dur: 0.5 },
          { pose: f[4], dur: 0.6, hold: 0.2, cue: "Drive up and stand", rep: true },
          { pose: f[5], dur: 0.5 },
          { pose: f[6], dur: 0.5, hold: 0.2, cue: "Now lunge back the same way" },
          { pose: f[5], dur: 0.6 },
          { pose: f[4], dur: 0.6, hold: 0.2, cue: "Drive up and step back", rep: true },
          { pose: f[3], dur: 0.5 },
          { pose: f[2], dur: 0.6, hold: 0.2, cue: "Drive up and stand", rep: true },
          { pose: f[1], dur: 0.5 },
          { pose: f[0], dur: 0.5, cue: "Step forward into a lunge" },
        ];
      })(),
    },
  },
  {
    slug: "lateral-lunge",
    name: "Lateral Lunge",
    region: "Legs",
    primary: ["glutes", "adductors", "quads"],
    secondary: ["hamstrings", "abs"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A side-to-side lunge that trains the legs in a plane most workouts ignore and stretches the inner thighs.",
    steps: [
      "Stand tall with feet hip-width apart and hands together at your chest.",
      "Take a big step out to the side, keeping both feet pointing forward.",
      "Sit your hips back and down over the stepping leg while the other leg stays straight.",
      "Lower until the bent knee is at about 90°, chest up and heel down.",
      "Push off the bent leg to return to standing, then alternate sides.",
    ],
    tips: ["Think of it as a one-sided squat: hips back, knee over the toes.", "Hold a dumbbell at your chest once bodyweight feels easy."],
    mistakes: ["Knee caving in or drifting far past the toes", "Heel of the working foot lifting", "Rounding the back to get lower"],
    breathing: "Inhale as you step and lower, exhale as you push back.",
    prescription: { sets: "3", reps: "8–12 each side", rest: "60 s" },
    animation: {
      camera: "front",
      frames: (() => {
        // Turned to face the camera (yaw 90) so the hips can travel sideways along world x.
        // Feet are given in world space and converted to body-relative targets.
        const arms: [LimbSpec] = [handLocal(22, 16, 5, [-0.3, 1, 0.8])];
        const pose = (x: number, y: number, torso: number, near: [number, number, number], far: [number, number, number]): Pose => {
          const leg = (f: [number, number, number], side: 1 | -1, bent: boolean): LimbSpec =>
            foot(8 + x, f[1], side * (x - f[0]), bent ? [1, -0.1, 0.45] : [1, 0, 0.1], f[2]);
          const bentNear = x - near[0] < 20 || near[1] < ANKLE_Y;
          const bentFar = far[0] - x < 20 || far[1] < ANKLE_Y;
          return { hip: [x, y], torso, head: -torso * 0.4, orient: { yaw: 90 }, arms, legs: [leg(near, 1, bentNear), leg(far, -1, bentFar)] };
        };
        const stand = pose(160, STAND_Y, 0, [149, ANKLE_Y, 0], [171, ANKLE_Y, 0]);
        const stepA = pose(145, 170, 10, [118, 232, 12], [171, ANKLE_Y, 0]);
        const lowA = pose(98, 184, 30, [74, ANKLE_Y, 0], [171, ANKLE_Y, 0]);
        const stepB = pose(175, 170, 10, [149, ANKLE_Y, 0], [202, 232, 12]);
        const lowB = pose(222, 184, 30, [149, ANKLE_Y, 0], [246, ANKLE_Y, 0]);
        return [
          { pose: stepA, dur: 0.6, cue: "Step out wide" },
          { pose: lowA, dur: 0.7, hold: 0.2, cue: "Push back to the middle" },
          { pose: stepA, dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Other side", rep: true },
          { pose: stepB, dur: 0.6 },
          { pose: lowB, dur: 0.7, hold: 0.2, cue: "Push back to the middle" },
          { pose: stepB, dur: 0.5 },
          { pose: stand, dur: 0.5, cue: "Step out wide", rep: true },
        ];
      })(),
    },
  },

  // ─────────────────────────── GLUTE BRIDGES ───────────────────────────
  {
    slug: "barbell-hip-thrust",
    name: "Barbell Hip Thrust",
    region: "Legs",
    primary: ["glutes"],
    secondary: ["hamstrings", "quads", "adductors", "abs"],
    equipment: ["Barbell", "Bench"],
    gear: ["barbell", "flat-bench"],
    level: "Intermediate",
    mechanics: "Isolation",
    summary: "The most direct way to load the glutes heavily, with the upper back supported on a bench.",
    steps: [
      "Sit on the floor with your upper back against the long side of a bench and a padded bar over your hip crease.",
      "Plant your feet flat, hip-width apart, so your shins are vertical at the top.",
      "Tuck your chin and ribs, then drive through your heels to lift your hips until your torso is level with your thighs.",
      "Squeeze your glutes hard for a second with your pelvis slightly tucked.",
      "Lower your hips under control until the plates nearly touch the floor.",
    ],
    tips: ["Keep your gaze forward, not at the ceiling — the torso pivots on the bench as one piece.", "Use a bar pad or folded mat so the bar doesn't dig into your hips."],
    mistakes: ["Arching the lower back instead of extending the hips", "Feet too far out so the hamstrings take over", "Pushing through the toes and lifting the heels"],
    breathing: "Inhale and brace at the bottom, exhale as you squeeze at the top.",
    prescription: { sets: "3–4", reps: "8–12", rest: "2 min" },
    animation: {
      camera: "front",
      props: [
        { type: "extra", kind: "lower:bench-across", params: { x: 110, top: 205 } },
        { type: "extra", kind: "lower:hip-bar", params: { forward: 13, down: 3 } },
      ],
      frames: (() => {
        // Wrists as far toward the bar as the arms reach; the hands close over it.
        const arms: [LimbSpec] = [{ ik: { x: 11, y: -6, z: 28, rel: "pelvis", local: true }, pole: [0, 0.6, 1] }];
        const legs: [LimbSpec] = [foot(226, ANKLE_Y, 13, [0.3, -1, 0.1])];
        return repFrames(
          { hip: [178, 221.6], torso: -60, head: 12, arms, legs },
          { hip: [179, 193], torso: -90, head: 30, arms, legs },
          { go: 1, back: 1.3, hold: 0.6, cues: ["Drive through your heels", "Squeeze, then lower"] },
        );
      })(),
    },
  },
  {
    slug: "single-leg-glute-bridge",
    name: "Single-Leg Glute Bridge",
    region: "Legs",
    primary: ["glutes"],
    secondary: ["hamstrings", "abs", "lower-back"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "A glute bridge on one leg — doubles the load and exposes left-right imbalances.",
    steps: [
      "Lie on your back with one knee bent and that foot flat, close to your glutes.",
      "Straighten the other leg so both thighs are parallel.",
      "Press through the heel of the planted foot and lift your hips until your body is straight from shoulders to knee.",
      "Keep your hips level — don't let the free side drop — and squeeze for a second.",
      "Lower slowly, finish all reps, then switch legs.",
    ],
    tips: ["Press your arms into the floor for balance.", "If your hamstring cramps, bring the working foot closer to your hips."],
    mistakes: ["Hips tilting toward the free leg", "Arching the lower back at the top", "Pushing through the toes"],
    breathing: "Exhale as you lift, inhale as you lower.",
    prescription: { sets: "3", reps: "10–15 each leg", rest: "45 s" },
    animation: {
      camera: "front",
      props: [{ type: "mat" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 150, y: 245.5, z: 24 }, pole: [0, -1, 0.3] }];
        const working = foot(205, ANKLE_Y, 11, [0.2, -1, 0.1]);
        return repFrames(
          { ...lyingOnBack(239, -90, arms), head: 0, legs: [working, { angles: [140, 140], foot: -140 }] },
          { ...lyingOnBack(210, -115.8, arms, 156), head: 28, legs: [working, { angles: [98, 98], foot: -98 }] },
          { go: 0.9, back: 1.2, hold: 0.6, cues: ["Drive through the heel", "Squeeze, then lower"] },
        );
      })(),
    },
  },
  {
    slug: "clamshell",
    name: "Clamshell",
    region: "Legs",
    primary: ["glutes"],
    secondary: [],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "A side-lying glute exercise that wakes up the hip rotators and side glutes — a classic warm-up and rehab move.",
    steps: [
      "Lie on your side with hips and knees bent, knees stacked and heels in line with your glutes.",
      "Rest your head on your lower arm and place your top hand on the floor in front of you.",
      "Keeping your feet together, lift your top knee as high as you can without rolling your hips back.",
      "Pause and squeeze the side of your glute.",
      "Lower the knee slowly, finish all reps, then switch sides.",
    ],
    tips: ["Stack your hips vertically — imagine your back against a wall.", "Loop a mini band just above your knees to make it harder."],
    mistakes: ["Rolling the pelvis backward to lift the knee higher", "Letting the feet come apart", "Rushing the reps"],
    breathing: "Exhale as you open, inhale as you close.",
    prescription: { sets: "2–3", reps: "15–20 each side", rest: "30 s" },
    animation: {
      camera: "front",
      props: [{ type: "mat" }],
      frames: (() => {
        // Face-down pose rolled onto the far side: the near (side 0) leg is on top.
        const base = { hip: [150, 227] as [number, number], torso: 90, orient: { roll: -90 } };
        const arms: [LimbSpec, LimbSpec] = [{ ik: { x: 207, y: 255, z: -16 }, pole: [0.5, 0.5, 0.5] }, { angles: [90, 90] }];
        const bottom: LimbSpec = { angles: [-45, -135], foot: 135 };
        const top = (pole: [number, number, number]): LimbSpec => ({ ik: { x: 84.8, y: 228.4, z: -1 }, pole, foot: 135 });
        return repFrames(
          { ...base, arms, legs: [top([-0.2, 1, 0]), bottom] },
          { ...base, arms, legs: [top([-0.2, 0.8, 0.6]), bottom] },
          { go: 0.8, back: 1.1, hold: 0.5, cues: ["Open the top knee", "Close slowly"] },
        );
      })(),
    },
  },

  // ───────────────────────────── HINGES ─────────────────────────────
  {
    slug: "sumo-deadlift",
    name: "Sumo Deadlift",
    region: "Legs",
    primary: ["glutes", "quads", "adductors"],
    secondary: ["hamstrings", "lower-back", "traps", "forearms"],
    equipment: ["Barbell"],
    gear: ["barbell", "weight-plates"],
    level: "Advanced",
    mechanics: "Compound",
    summary: "A wide-stance deadlift with a more upright back — more legs and hips, less lower-back strain.",
    steps: [
      "Stand with a wide stance, toes turned out 30–45°, the bar over your mid-foot and touching your shins.",
      "Hinge down and grip the bar with straight arms inside your knees, hands about shoulder-width apart.",
      "Drop your hips, push your knees out over your toes and lift your chest so your back is flat.",
      "Brace, pull the slack out of the bar, then push the floor apart with your feet to stand up.",
      "Lock out with hips and knees straight, then lower the bar down your legs the same way.",
    ],
    tips: ["Think “spread the floor” — actively pushing the knees out is what makes sumo work.", "Keep the bar dragging up your legs; it should never swing forward."],
    mistakes: ["Hips shooting up first so it becomes a stiff-legged pull", "Knees caving inward off the floor", "Stance so wide the shins angle inward"],
    breathing: "Big breath and brace before each rep, exhale at the top.",
    prescription: { sets: "3–5", reps: "3–6", rest: "3 min" },
    animation: {
      camera: "front",
      props: [{ type: "barbell" }],
      frames: (() => {
        const legs: [LimbSpec] = [foot(160, ANKLE_Y, 32, [0.7, -0.1, 0.7])];
        const grip = (x: number, y: number): [LimbSpec] => [{ ik: { x, y, z: 17 }, pole: [-1, 0, 0.2] }];
        const floor: Pose = { hip: [136, 209], torso: 47, head: -18, arms: grip(167, 223), legs };
        const knee: Pose = { hip: [148, 184], torso: 28, head: -10, arms: grip(168, 188), legs };
        const top: Pose = { hip: [161, 161], torso: -2, arms: grip(162, 157), legs };
        return [
          { pose: floor, dur: 0.9, hold: 0.3, cue: "Push the floor apart", rep: true },
          { pose: knee, dur: 0.6 },
          { pose: top, dur: 0.8, hold: 0.4, cue: "Lower the same way" },
          { pose: knee, dur: 0.7 },
        ];
      })(),
    },
  },
  {
    slug: "trap-bar-deadlift",
    name: "Trap Bar Deadlift",
    region: "Legs",
    primary: ["glutes", "quads", "hamstrings"],
    secondary: ["lower-back", "traps", "forearms", "abs"],
    equipment: ["Trap bar"],
    gear: ["trap-bar", "weight-plates"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "The friendliest way to deadlift heavy: you stand inside the bar, so it stays in line with your body.",
    steps: [
      "Step into the middle of the trap bar with feet hip-width apart, handles in line with your ankles.",
      "Hinge and bend your knees to grip the handles in the centre, arms straight at your sides.",
      "Set your back flat, chest up, and take the slack out of the bar.",
      "Drive through your whole foot to stand up, pushing your hips through at the top.",
      "Lower under control by pushing your hips back and bending your knees.",
    ],
    tips: ["It sits between a squat and a deadlift — let your knees bend more than on a straight bar.", "Grip dead centre on the handles or the bar will tip."],
    mistakes: ["Rounding the back off the floor", "Leaning back at lockout", "Letting the bar drop at the bottom"],
    breathing: "Brace before each rep, exhale as you lock out.",
    prescription: { sets: "3–5", reps: "4–8", rest: "2–3 min" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:trap-bar", params: { handZ: 28 } }],
      frames: (() => {
        const legs: [LimbSpec] = [flat(162, 13, [1, -0.1, 0.3])];
        const grip = (x: number, y: number): [LimbSpec] => [{ ik: { x, y, z: 28 }, pole: [-1, 0, 0.3] }];
        const floor: Pose = { hip: [124, 210], torso: 44, head: -16, arms: grip(167, 223), legs };
        const knee: Pose = { hip: [141, 183], torso: 24, head: -8, arms: grip(165, 184), legs };
        const top: Pose = { hip: [161, STAND_Y], torso: -1, arms: grip(163, 152), legs };
        return [
          { pose: floor, dur: 0.8, hold: 0.3, cue: "Drive through your feet", rep: true },
          { pose: knee, dur: 0.6 },
          { pose: top, dur: 0.7, hold: 0.4, cue: "Hips back, lower with control" },
          { pose: knee, dur: 0.7 },
        ];
      })(),
    },
  },
  {
    slug: "single-leg-romanian-deadlift",
    name: "Single-Leg Romanian Deadlift",
    region: "Legs",
    primary: ["hamstrings", "glutes"],
    secondary: ["lower-back", "adductors", "abs", "forearms"],
    equipment: ["Dumbbell"],
    gear: ["dumbbells"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "A one-leg hip hinge that builds hamstrings, glutes and rock-solid balance.",
    steps: [
      "Stand on one leg with a slight bend in the knee, a dumbbell in each hand.",
      "Hinge forward at the hip while your free leg reaches straight back behind you.",
      "Keep your hips square to the floor and your back flat, arms hanging straight down.",
      "Lower until your torso and back leg are close to parallel with the floor, or until your hamstring stops you.",
      "Drive your hip forward to stand tall, finish all reps, then switch legs.",
    ],
    tips: ["Imagine a straight line from your head to your back heel that tips like a see-saw.", "Point the toes of the back foot at the floor to keep your hips square."],
    mistakes: ["Opening the hip so the back leg rotates outward", "Rounding the back to reach lower", "Bending the standing knee into a squat"],
    breathing: "Inhale as you hinge down, exhale as you stand up.",
    prescription: { sets: "3", reps: "8–12 each leg", rest: "90 s" },
    animation: {
      camera: "side",
      props: [{ type: "dumbbell" }],
      frames: repFrames(
        { hip: [160, STAND_Y], torso: 0, arms: [armsDown], legs: [flat(162, 10, [1, 0, 0.1]), { angles: [-6, -30], foot: 20 }] },
        { hip: [153, 161], torso: 80, head: -14, arms: [armsDown], legs: [flat(162, 10, [1, 0, 0.1]), { angles: [-78, -78], foot: 80 }] },
        { go: 1.6, back: 1.2, hold: 0.3, cues: ["Hinge and reach the leg back", "Drive your hip forward"] },
      ),
    },
  },
  {
    slug: "barbell-good-morning",
    name: "Barbell Good Morning",
    region: "Legs",
    primary: ["hamstrings", "lower-back"],
    secondary: ["glutes", "abs", "upper-back"],
    equipment: ["Barbell"],
    gear: ["barbell", "power-rack"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "A barbell hinge with the bar on your back that strengthens the hamstrings and spinal erectors.",
    steps: [
      "Set a light bar on your upper back as for a back squat, feet hip-width apart.",
      "Unlock your knees slightly and keep that bend throughout.",
      "Brace and push your hips back, letting your chest tip forward with a flat back.",
      "Lower until your torso is near parallel or you feel a strong hamstring stretch.",
      "Drive your hips forward to return to standing.",
    ],
    tips: ["Start much lighter than your squat — this is a leverage-heavy lift.", "Keep the bar pinned tight to your back by pulling it down into your traps."],
    mistakes: ["Rounding the lower back at the bottom", "Bending the knees into a squat", "Going heavier than you can control"],
    breathing: "Inhale and brace at the top, exhale as you stand back up.",
    prescription: { sets: "3", reps: "8–12", rest: "2 min" },
    animation: {
      camera: "side",
      props: [{ type: "barbell", at: "back" }],
      frames: (() => {
        const arms: [LimbSpec] = [handLocal(-8, -2, 40, [-0.4, 1, 0.5])];
        return repFrames(
          { hip: [160, STAND_Y], torso: 1, arms, legs: [flat(162, 12)] },
          { hip: [129, 166], torso: 76, head: -24, arms, legs: [flat(162, 12)] },
          { go: 1.6, back: 1.2, hold: 0.2, cues: ["Hips back, chest tips forward", "Drive your hips through"] },
        );
      })(),
    },
  },
  {
    slug: "cable-pull-through",
    name: "Cable Pull-Through",
    region: "Legs",
    primary: ["glutes", "hamstrings"],
    secondary: ["lower-back", "abs", "forearms"],
    equipment: ["Cable"],
    gear: ["cable-machine"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A hip hinge with the cable pulling you back — an easy way to learn the hinge and feel the glutes work.",
    steps: [
      "Attach a rope to a low pulley, face away from the machine and hold the rope between your legs.",
      "Walk out a couple of steps and stand with feet a little wider than hip-width.",
      "With soft knees, push your hips back and let the rope pull your hands back between your legs.",
      "Keep your back flat and arms straight — they only hold the rope.",
      "Drive your hips forward to stand tall and squeeze your glutes hard at the top.",
    ],
    tips: ["Think “hips back to the machine”, not “bend over”.", "Stand tall at the top — don't lean back to finish."],
    mistakes: ["Squatting down instead of hinging", "Pulling with the arms", "Hyper-extending the lower back at lockout"],
    breathing: "Inhale as you hinge back, exhale as you drive forward.",
    prescription: { sets: "3", reps: "12–15", rest: "60 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:low-cable", params: { x: 45, pulleyY: 236 } }],
      frames: repFrames(
        { hip: [161, STAND_Y], torso: 0, arms: [hand(6, 58, 6, [-1, 0, 0.3])], legs: [flat(163, 18, [1, 0, 0.3])] },
        { hip: [128, 168], torso: 68, head: -14, arms: [hand(-25, 51, 6, [-1, 0, 0.3])], legs: [flat(163, 18, [1, 0, 0.3])] },
        { go: 1.4, back: 1, hold: 0.3, cues: ["Hips back toward the machine", "Drive your hips through"] },
      ),
    },
  },

  // ───────────────────────────── MACHINES ─────────────────────────────
  {
    slug: "leg-press",
    name: "Leg Press",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["adductors", "hamstrings", "calves"],
    equipment: ["Machine"],
    gear: ["leg-press"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "Heavy leg training with your back supported — great for building quads without loading the spine.",
    steps: [
      "Sit with your back and hips flat against the pad and place your feet hip-width apart in the middle of the platform.",
      "Press the platform up and release the safety handles, keeping a slight bend in your knees.",
      "Lower the sled under control, letting your knees travel toward your chest while your hips stay on the seat.",
      "Stop when your knees are at about 90° or just before your lower back starts to lift off the pad.",
      "Press through your whole foot back to the start without locking your knees.",
    ],
    tips: ["Feet higher on the platform bias the glutes and hamstrings; lower biases the quads.", "Keep your knees in line with your toes the whole way."],
    mistakes: ["Letting the hips roll up off the seat at the bottom", "Locking the knees hard at the top", "Pushing through the toes with the heels lifting"],
    breathing: "Inhale as the sled comes down, exhale as you press it away.",
    prescription: { sets: "3–4", reps: "10–15", rest: "2 min" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:leg-press" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 112, y: 197, z: 30 }, pole: [0, 1, 0.5] }];
        const press = (x: number, y: number): [LimbSpec] => [foot(x, y, 14, [-0.7, -0.7, 0.3], -135)];
        return repFrames(
          { hip: [120, 205], torso: -55, head: 20, arms, legs: press(180.4, 145.9) },
          { hip: [120, 205], torso: -55, head: 20, arms, legs: press(164.9, 161.5) },
          { go: 1.5, back: 1.1, hold: 0.2, cues: ["Lower the sled under control", "Press through your whole foot"] },
        );
      })(),
    },
  },
  {
    slug: "hack-squat",
    name: "Hack Squat",
    region: "Legs",
    primary: ["quads"],
    secondary: ["glutes", "adductors", "hamstrings"],
    equipment: ["Machine"],
    gear: ["hack-squat"],
    level: "Intermediate",
    mechanics: "Compound",
    summary: "A machine squat on an angled sled that lets you train the quads hard with your back fully supported.",
    steps: [
      "Stand on the platform with your back flat against the pad and the shoulder pads snug on top of your shoulders.",
      "Place your feet hip- to shoulder-width apart, a little forward of your hips, and release the safety handles.",
      "Bend your knees and lower the sled, letting your knees travel forward over your toes.",
      "Go down until your thighs are at least parallel to the platform, keeping your back and hips on the pad.",
      "Drive through your whole foot to push the sled back up without locking your knees.",
    ],
    tips: ["A lower foot position puts even more work on the quads.", "Control the lowering — the machine makes it easy to drop too fast."],
    mistakes: ["Hips peeling away from the back pad", "Heels lifting at the bottom", "Cutting the depth short"],
    breathing: "Inhale on the way down, exhale as you drive up.",
    prescription: { sets: "3–4", reps: "8–12", rest: "2 min" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:hack-squat" }],
      frames: (() => {
        const arms: [LimbSpec] = [handLocal(9, -4, 30, [0.7, 0.7, 0.8])];
        const legs: [LimbSpec] = [foot(175.5, 236, 14, [1, -0.2, 0.25], -15)];
        return repFrames(
          { hip: [137.9, 157.9], torso: -45, head: 12, arms, legs },
          { hip: [161.9, 181.9], torso: -45, head: 16, arms, legs },
          { go: 1.5, back: 1.1, hold: 0.2, cues: ["Lower with control", "Drive the sled up"] },
        );
      })(),
    },
  },
  {
    slug: "leg-extension",
    name: "Leg Extension",
    region: "Legs",
    primary: ["quads"],
    secondary: [],
    equipment: ["Machine"],
    gear: ["leg-extension"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Isolates the quads by straightening the knee against a padded lever.",
    steps: [
      "Adjust the seat so your knees line up with the machine's pivot and the pad sits on your lower shins, just above the ankles.",
      "Sit back against the backrest and hold the side handles.",
      "Straighten your knees to lift the pad until your legs are almost fully extended.",
      "Squeeze your quads for a moment at the top.",
      "Lower slowly back to the start without letting the weight stack touch down.",
    ],
    tips: ["Pull your toes up toward your shins to keep tension on the quads.", "Use a controlled 2–3 second lowering phase."],
    mistakes: ["Swinging the weight up with momentum", "Hips lifting off the seat", "Knee not lined up with the pivot"],
    breathing: "Exhale as you extend, inhale as you lower.",
    prescription: { sets: "3", reps: "12–15", rest: "60 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:leg-extension" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 145, y: 180, z: 27 }, pole: [-0.5, 0.3, 1] }];
        return repFrames(
          { hip: [140, 185], torso: -8, arms, legs: [{ angles: [90, -5], foot: 5 }] },
          { hip: [140, 185], torso: -8, arms, legs: [{ angles: [90, 84], foot: -84 }] },
          { go: 0.9, back: 1.6, hold: 0.4, cues: ["Straighten your knees", "Lower slowly"] },
        );
      })(),
    },
  },
  {
    slug: "lying-leg-curl",
    name: "Lying Leg Curl",
    region: "Legs",
    primary: ["hamstrings"],
    secondary: ["calves"],
    equipment: ["Machine"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Isolates the hamstrings by curling your heels toward your glutes against a padded lever.",
    steps: [
      "Lie face down with your knees just off the end of the pad and the roller resting on the back of your ankles.",
      "Hold the handles and press your hips into the pad.",
      "Curl your heels toward your glutes as far as you can.",
      "Squeeze your hamstrings for a moment at the top.",
      "Lower slowly until your legs are almost straight.",
    ],
    tips: ["Keep your hips down — if they lift, the weight is too heavy.", "Pointing your toes slightly reduces calf involvement."],
    mistakes: ["Hips rising off the pad", "Jerking the weight up", "Cutting the lowering phase short"],
    breathing: "Exhale as you curl, inhale as you lower.",
    prescription: { sets: "3", reps: "10–15", rest: "60 s" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:lying-leg-curl" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 238, y: 196, z: 22 }, pole: [0.2, 0.6, 1] }];
        return repFrames(
          { hip: [160, 169], torso: 90, head: -18, arms, legs: [{ angles: [-90, -92], foot: 92 }] },
          { hip: [160, 169], torso: 90, head: -18, arms, legs: [{ angles: [-90, -205], foot: 205 }] },
          { go: 1, back: 1.6, hold: 0.3, cues: ["Curl your heels to your glutes", "Lower slowly"] },
        );
      })(),
    },
  },
  {
    slug: "smith-machine-squat",
    name: "Smith Machine Squat",
    region: "Legs",
    primary: ["quads", "glutes"],
    secondary: ["adductors", "hamstrings", "abs"],
    equipment: ["Machine", "Barbell"],
    gear: ["smith-machine"],
    level: "Beginner",
    mechanics: "Compound",
    summary: "A squat on a guided bar — easy to learn and safe to push hard without a spotter.",
    steps: [
      "Set the bar just below shoulder height and step under it so it rests on your upper traps.",
      "Place your feet shoulder-width apart and slightly in front of the bar.",
      "Unhook the bar by rotating it, brace your core and sit down with your chest up.",
      "Lower until your thighs are at least parallel, keeping your knees in line with your toes.",
      "Drive through your whole foot to stand, then re-hook the bar at the end of the set.",
    ],
    tips: ["Set the safety stops just below your bottom position.", "Feet slightly forward keeps your torso upright on the fixed bar path."],
    mistakes: ["Feet directly under the bar so the knees and lower back take over", "Heels lifting at the bottom", "Bouncing off the safety stops"],
    breathing: "Inhale and brace at the top, exhale as you drive up.",
    prescription: { sets: "3–4", reps: "8–12", rest: "2 min" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:smith", params: { x: 149 } }],
      frames: (() => {
        const arms: [LimbSpec] = [handLocal(-8, -2, 40, [-0.4, 1, 0.5])];
        return repFrames(
          { hip: [158, 158], torso: 0, arms, legs: [flat(170, 15, [1, -0.1, 0.3])] },
          { hip: [129.5, 212], torso: 25, head: -14, arms, legs: [flat(170, 15, [1, -0.1, 0.3])] },
          { go: 1.4, cues: ["Sit down, chest up", "Drive up through your feet"] },
        );
      })(),
    },
  },
  {
    slug: "seated-calf-raise",
    name: "Seated Calf Raise",
    region: "Legs",
    primary: ["calves"],
    secondary: [],
    equipment: ["Machine"],
    gear: ["seated-calf-raise"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Bent-knee calf raises that target the deep soleus muscle for fuller lower legs.",
    steps: [
      "Sit on the machine with the balls of your feet on the edge of the foot block and the pad snug on your lower thighs.",
      "Lift the pad slightly and release the safety lever.",
      "Lower your heels as far as you can for a deep stretch.",
      "Push through the balls of your feet to raise your heels as high as possible.",
      "Pause and squeeze at the top, then lower slowly.",
    ],
    tips: ["Pause for a second in the stretched position to take the bounce out.", "Keep your feet pointing straight ahead."],
    mistakes: ["Bouncing at the bottom", "Using a short, half range of motion", "Rolling onto the outside of the foot"],
    breathing: "Exhale as you raise your heels, inhale as you lower.",
    prescription: { sets: "3–4", reps: "12–20", rest: "45 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:seated-calf" }],
      frames: (() => {
        const arms: [LimbSpec] = [{ ik: { x: 174, y: 178, z: 16 }, pole: [0, 1, 0.8] }];
        // Balls of the feet stay on the block (toe at x 200): the ankle moves as the foot tilts.
        const heel = (tilt: number): [LimbSpec] => {
          const r = (tilt * Math.PI) / 180;
          return [foot(200 - 16 * Math.cos(r), 236 - 16 * Math.sin(r), 13, [0.7, -0.7, 0.1], tilt)];
        };
        return repFrames(
          { hip: [139, 190], torso: 0, arms, legs: heel(-20) },
          { hip: [139, 190], torso: 0, arms, legs: heel(32) },
          { go: 0.9, back: 1.3, hold: 0.6, cues: ["Heels up high", "Lower into the stretch"] },
        );
      })(),
    },
  },

  // ─────────────────────── BODYWEIGHT & FLOOR ───────────────────────
  {
    slug: "wall-sit",
    name: "Wall Sit",
    region: "Legs",
    primary: ["quads"],
    secondary: ["glutes", "adductors", "calves"],
    equipment: ["Bodyweight"],
    level: "Beginner",
    mechanics: "Isolation",
    hold: true,
    summary: "A static squat against a wall that builds quad endurance with zero equipment.",
    steps: [
      "Stand with your back against a wall and walk your feet about two feet out in front of you.",
      "Slide down until your thighs are parallel to the floor and your knees are bent at 90°.",
      "Keep your knees directly over your ankles and your whole back against the wall.",
      "Hold the position, breathing steadily, then slide back up to finish.",
    ],
    tips: ["Cross your arms on your chest — resting your hands on your thighs makes it easier.", "Start with 20–30 seconds and add time each week."],
    mistakes: ["Hips higher than the knees", "Knees drifting past the toes", "Holding your breath"],
    breathing: "Breathe slowly and steadily throughout the hold.",
    prescription: { sets: "3", reps: "30–60 s hold", rest: "60 s" },
    animation: {
      camera: "front",
      props: [{ type: "extra", kind: "lower:wall", params: { x: 116 } }],
      frames: (() => {
        const arms: [LimbSpec, LimbSpec] = [handLocal(19, 15, -9, [0.2, 1, 0.9]), handLocal(17, 11, -9, [0.2, 1, 0.9])];
        const legs: [LimbSpec] = [foot(175, ANKLE_Y, 12, [1, -0.1, 0.1])];
        return [
          { pose: { hip: [130, 199], torso: 0, arms, legs }, dur: 2, cue: "Thighs parallel, back on the wall", rep: true },
          { pose: { hip: [130, 199.8], torso: 0.6, arms, legs }, dur: 2, cue: "Breathe and hold" },
        ];
      })(),
    },
  },
  {
    slug: "nordic-hamstring-curl",
    name: "Nordic Hamstring Curl",
    region: "Legs",
    primary: ["hamstrings"],
    secondary: ["glutes", "calves", "lower-back"],
    equipment: ["Bodyweight"],
    level: "Advanced",
    mechanics: "Isolation",
    summary: "A brutal bodyweight hamstring exercise shown to cut hamstring-strain risk in athletes.",
    steps: [
      "Kneel on a pad with your ankles hooked securely under a roller, a bench or a partner's hands.",
      "Keep a straight line from your knees to your head, hips extended and glutes squeezed.",
      "Lean forward slowly, resisting the fall with your hamstrings for as long as you can.",
      "When you can't hold it any longer, catch yourself with your hands in a push-up position.",
      "Push off lightly with your hands and pull yourself back up with your hamstrings.",
    ],
    tips: ["The lowering is the exercise — aim for 3–5 seconds before you catch yourself.", "Use a resistance band around your chest for assistance while you build up."],
    mistakes: ["Bending at the hips instead of staying in a straight line", "Dropping quickly instead of fighting the descent", "Ankles not anchored securely"],
    breathing: "Breathe steadily as you lower, exhale as you push back up.",
    prescription: { sets: "3", reps: "3–6", rest: "2 min" },
    animation: {
      camera: "side",
      props: [{ type: "extra", kind: "lower:nordic-anchor", params: { knee: 150, ankle: 107 } }],
      frames: (() => {
        // Body rotates as one piece about the knees (x 150, y 240).
        const lean = (deg: number, head: number, hands: [number, number]): Pose => {
          const r = (deg * Math.PI) / 180;
          return {
            hip: [150 + 48 * Math.sin(r), 240 - 48 * Math.cos(r)],
            torso: deg,
            head,
            arms: [{ ik: { x: hands[0], y: hands[1], z: 20 }, pole: [-0.3, 1, 0.7] }],
            legs: [{ angles: [-deg, -90], foot: 175 }],
          };
        };
        return [
          { pose: lean(0, 0, [172, 150]), dur: 1.4, cue: "Lower as slowly as you can", rep: true },
          { pose: lean(40, -10, [238, 186]), dur: 1.3 },
          { pose: lean(68, -24, [262, 243]), dur: 0.7, hold: 0.25, cue: "Push off and pull back up" },
          { pose: lean(45, -12, [246, 212]), dur: 0.9 },
        ];
      })(),
    },
  },
  {
    slug: "donkey-kick",
    name: "Donkey Kick",
    region: "Legs",
    primary: ["glutes"],
    secondary: ["hamstrings", "abs"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "A kneeling kick that isolates the glutes — a staple of glute warm-ups and home workouts.",
    steps: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "Keeping the knee bent at 90°, drive one foot up toward the ceiling.",
      "Lift until your thigh is in line with your torso, squeezing the glute at the top.",
      "Lower the knee back under the hip without touching down, then repeat.",
      "Finish all reps, then switch legs.",
    ],
    tips: ["Keep your lower back flat — the movement comes from the hip, not the spine.", "Add an ankle weight or a band behind the knee to progress."],
    mistakes: ["Arching the lower back to kick higher", "Swinging the leg with momentum", "Rotating the hips open"],
    breathing: "Exhale as you kick up, inhale as you lower.",
    prescription: { sets: "3", reps: "12–20 each leg", rest: "45 s" },
    animation: {
      camera: "side",
      props: [{ type: "mat" }],
      frames: (() => {
        const base = { hip: [152.9, 198.4] as [number, number], torso: 78, head: -8 };
        const arms: [LimbSpec] = [{ ik: { x: 213, y: 243, z: 20 }, pole: [-0.6, -1, 0.5] }];
        const kneel: LimbSpec = { angles: [0, -90], foot: 178 };
        return repFrames(
          { ...base, arms, legs: [{ angles: [-6, -96], foot: 178 }, kneel] },
          { ...base, arms, legs: [{ angles: [-96, -182], foot: 178 }, kneel] },
          { go: 0.8, back: 1, hold: 0.4, cues: ["Drive your heel to the ceiling", "Lower with control"] },
        );
      })(),
    },
  },
  {
    slug: "fire-hydrant",
    name: "Fire Hydrant",
    region: "Legs",
    primary: ["glutes"],
    secondary: ["obliques", "abs"],
    equipment: ["Bodyweight"],
    gear: ["exercise-mat"],
    level: "Beginner",
    mechanics: "Isolation",
    summary: "Lifts the bent leg out to the side to work the side glutes that stabilise your hips and knees.",
    steps: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "Keeping the knee bent at 90°, lift one leg out to the side.",
      "Raise it until the thigh is about parallel to the floor without tilting your torso.",
      "Pause, then lower the knee back under the hip.",
      "Finish all reps, then switch sides.",
    ],
    tips: ["Keep your weight evenly on both hands so your shoulders stay level.", "A mini band just above the knees makes it much harder."],
    mistakes: ["Leaning the whole body away from the working leg", "Rotating the spine to lift higher", "Rushing the reps"],
    breathing: "Exhale as you lift, inhale as you lower.",
    prescription: { sets: "3", reps: "12–20 each side", rest: "45 s" },
    animation: {
      camera: "back",
      props: [{ type: "mat" }],
      frames: (() => {
        const base = { hip: [152.9, 198.4] as [number, number], torso: 78, head: -8 };
        const arms: [LimbSpec] = [{ ik: { x: 213, y: 243, z: 20 }, pole: [-0.6, -1, 0.5] }];
        const kneel: LimbSpec = { angles: [0, -90], spread: [0, 0], foot: 178 };
        return repFrames(
          { ...base, arms, legs: [{ angles: [-4, -90], spread: [6, 0], foot: 178 }, kneel] },
          { ...base, arms, legs: [{ angles: [-4, -90], spread: [68, 0], foot: 178 }, kneel] },
          { go: 0.8, back: 1, hold: 0.4, cues: ["Lift the knee out to the side", "Lower with control"] },
        );
      })(),
    },
  },
];
