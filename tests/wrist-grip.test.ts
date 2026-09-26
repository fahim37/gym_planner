import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Timeline } from "@/lib/anatomy/timeline";
import { solvePose } from "@/lib/anatomy/solver";
import { GRIP_TURN, type Animation, type GripStyle, type Pose } from "@/lib/anatomy/types";
import { BoneSolver, armBone, A_HAND } from "@/lib/three/body/skeleton";

/** Standing, forearm horizontal forward (a curl's midpoint). */
const pose = (extra: Partial<Pose> = {}, wrist?: number): Pose => ({
  hip: [160, 150],
  torso: 0,
  arms: [{ angles: [0, 90], ...(wrist === undefined ? {} : { wrist }) }],
  legs: [{ angles: [0, 0] }],
  ...extra,
});

const anim = (a: Pose, b: Pose): Animation => ({ frames: [{ pose: a, dur: 1 }, { pose: b, dur: 1 }] });

/** Hand bone axes after solving: y = along the fingers, x = palm normal. */
function hand(p: Pose, grip: GripStyle | null = null) {
  const solver = new BoneSolver();
  if (grip) solver.grips = [{ radius: 0.014, style: grip }, { radius: 0.014, style: grip }];
  solver.update(solvePose(p));
  const m = solver.matrices[armBone(0, A_HAND)];
  const x = new THREE.Vector3();
  const y = new THREE.Vector3();
  const z = new THREE.Vector3();
  m.extractBasis(x, y, z);
  return { palm: x, fingers: y };
}

describe("wrist flexion", () => {
  it("defaults to 0 and interpolates between keyframes", () => {
    const tl = new Timeline(anim(pose({}, 0), pose({}, 60)), { life: false });
    const w = (t: number) => (tl.sample(t).pose.arms[0] as { wrist?: number }).wrist;
    expect(w(0)).toBe(0);
    expect(w(0.5)).toBeCloseTo(30, 5);
    expect(w(1)).toBeCloseTo(60, 5);
    // Missing value normalises to 0 on both arms.
    const tl2 = new Timeline(anim(pose(), pose({}, 40)), { life: false });
    expect((tl2.sample(0).pose.arms[1] as { wrist?: number }).wrist).toBe(0);
  });

  it("is passed to the skeleton", () => {
    expect(solvePose(pose({}, 35)).sides[0].wristFlex).toBe(35);
    expect(solvePose(pose()).sides[0].wristFlex).toBe(0);
  });

  it("bends the hand towards the palm for positive values and away for negative", () => {
    const flat = hand(pose({}, 0));
    const flex = hand(pose({}, 50));
    const ext = hand(pose({}, -50));
    // The angle between the fingers and the forearm grows either way…
    expect(flex.fingers.angleTo(flat.fingers)).toBeCloseTo((50 * Math.PI) / 180, 1);
    expect(ext.fingers.angleTo(flat.fingers)).toBeCloseTo((50 * Math.PI) / 180, 1);
    // …towards the palm for flexion, away from it for extension.
    expect(flex.fingers.dot(flat.palm)).toBeGreaterThan(0.5);
    expect(ext.fingers.dot(flat.palm)).toBeLessThan(-0.5);
  });
});

describe("per-keyframe grip style", () => {
  it("turns the forearm smoothly between styles (Zottman curl)", () => {
    const tl = new Timeline(anim(pose({ grip: "underhand" }), pose({ grip: "overhand" })), { life: false });
    const turn = (t: number) => tl.sample(t).pose.gripTurn!;
    expect(turn(0)).toEqual([GRIP_TURN.underhand, GRIP_TURN.underhand]);
    expect(turn(0.5)[0]).toBeCloseTo((GRIP_TURN.underhand + GRIP_TURN.overhand) / 2, 5);
    expect(turn(1)).toEqual([GRIP_TURN.overhand, GRIP_TURN.overhand]);
    // The style label switches at the midpoint.
    expect(tl.sample(0.4).pose.grip).toBe("underhand");
    expect(tl.sample(0.6).pose.grip).toBe("overhand");
  });

  it("accepts a per-arm pair and reaches the skeleton", () => {
    const sk = solvePose(new Timeline(anim(pose({ grip: ["underhand", "overhand"] }), pose({ grip: ["underhand", "overhand"] })), { life: false }).sample(0).pose);
    expect(sk.sides[0].gripTurn).toBe(GRIP_TURN.underhand);
    expect(sk.sides[1].gripTurn).toBe(GRIP_TURN.overhand);
    expect(solvePose(pose()).sides[0].gripTurn).toBeUndefined();
  });

  it("overrides the prop's grip style", () => {
    const prop = hand(pose(), "neutral");
    const under = hand(pose({ grip: "underhand" }), "neutral");
    const over = hand(pose({ grip: "overhand" }), "neutral");
    // Underhand and overhand palms face opposite ways, both unlike the neutral prop grip.
    expect(under.palm.dot(over.palm)).toBeLessThan(-0.6);
    expect(Math.abs(under.palm.dot(prop.palm))).toBeLessThan(0.5);
  });
});
