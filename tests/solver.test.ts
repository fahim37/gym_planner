import { describe, expect, it } from "vitest";
import { BODY, solvePose, solveTwoBone } from "@/lib/anatomy/solver";
import type { AngleLimb, IkLimb, LimbSpec, Pose, Skeleton, Vec3 } from "@/lib/anatomy/types";
import { cross, dist, dot, len, namedJoints, resolveIkTarget, rng, skeletonNumbers, sub } from "./support/anatomy";

const EPS = 1e-6;

function expectVec(actual: Vec3, expected: Vec3, precision = 6) {
  actual.forEach((v, i) => expect(v, `component ${i} of ${JSON.stringify(actual)}`).toBeCloseTo(expected[i], precision));
}

const basePose = (overrides: Partial<Pose> = {}): Pose => ({
  hip: [160, 156],
  torso: 0,
  arms: [{ angles: [0, 0] }],
  legs: [{ ik: { x: 162, y: 245, z: 11 }, pole: [1, 0, 0.12] }],
  ...overrides,
});

describe("solveTwoBone", () => {
  const r = rng(1);
  const l1 = 31;
  const l2 = 28;

  it("reaches reachable targets exactly and keeps both bone lengths", () => {
    for (let n = 0; n < 500; n++) {
      const root: Vec3 = [r.range(-100, 100), r.range(-100, 100), r.range(-50, 50)];
      const dir: Vec3 = [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)];
      const d = r.range(Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
      const target: Vec3 = [root[0] + (dir[0] / len(dir)) * d, root[1] + (dir[1] / len(dir)) * d, root[2] + (dir[2] / len(dir)) * d];
      const pole: Vec3 = [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)];
      const [mid, end] = solveTwoBone(root, target, l1, l2, pole);
      expectVec(end, target);
      expect(dist(root, mid)).toBeCloseTo(l1, 6);
      expect(dist(mid, end)).toBeCloseTo(l2, 6);
    }
  });

  it("clamps unreachable (too far) targets to a nearly straight limb pointing at the target", () => {
    const root: Vec3 = [0, 0, 0];
    const target: Vec3 = [0, 200, 0];
    const [mid, end] = solveTwoBone(root, target, l1, l2, [1, 0, 0]);
    expect(dist(root, end)).toBeCloseTo(l1 + l2 - 0.01, 6);
    expectVec(end, [0, l1 + l2 - 0.01, 0]);
    expect(dist(root, mid)).toBeCloseTo(l1, 6);
    expect(dist(mid, end)).toBeCloseTo(l2, 6);
  });

  it("clamps targets closer than |l1 - l2| to the most folded limb", () => {
    const root: Vec3 = [10, 10, 10];
    const target: Vec3 = [10, 11, 10];
    const [mid, end] = solveTwoBone(root, target, l1, l2, [1, 0, 0]);
    expect(dist(root, end)).toBeCloseTo(Math.abs(l1 - l2) + 0.01, 6);
    expect(dist(root, mid)).toBeCloseTo(l1, 6);
    expect(dist(mid, end)).toBeCloseTo(l2, 6);
  });

  it("bends the middle joint toward the pole", () => {
    const root: Vec3 = [0, 0, 0];
    const target: Vec3 = [0, 40, 0];
    for (const pole of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]) {
      const [mid] = solveTwoBone(root, target, l1, l2, pole);
      expect(dot(mid, pole), `pole ${JSON.stringify(pole)}`).toBeGreaterThan(5);
    }
  });

  it("falls back to a sideways bend when the pole is parallel to the limb", () => {
    const [mid, end] = solveTwoBone([0, 0, 0], [0, 40, 0], l1, l2, [0, 1, 0]);
    expect(mid[2]).toBeGreaterThan(5);
    expectVec(end, [0, 40, 0]);
  });

  it("never returns NaN, even for degenerate input", () => {
    const cases: [Vec3, Vec3, Vec3][] = [
      [[0, 0, 0], [0, 0, 0], [1, 0, 0]],
      [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      [[0, 0, 0], [59, 0, 0], [1, 0, 0]],
      [[0, 0, 0], [1e6, 0, 0], [0, 1, 0]],
    ];
    for (const [root, target, pole] of cases) {
      const out = solveTwoBone(root, target, l1, l2, pole).flat();
      expect(out.every(Number.isFinite), JSON.stringify({ root, target, pole, out })).toBe(true);
    }
  });
});

describe("solvePose: IK limbs", () => {
  it("puts the wrist exactly on a reachable world target, mirrored for the far arm", () => {
    const arm: IkLimb = { ik: { x: 180, y: 110, z: 25 }, pole: [-1, 0.2, 0.3] };
    const s = solvePose(basePose({ arms: [arm] }));
    expectVec(s.sides[0].wrist, [180, 110, 25]);
    expectVec(s.sides[1].wrist, [180, 110, -25]);
  });

  it("defaults a world target's z to the limb root's distance from the midline", () => {
    const s = solvePose(basePose({ arms: [{ ik: { x: 175, y: 120 }, pole: [-1, 0, 0] }] }));
    expect(s.sides[0].wrist[2]).toBeCloseTo(BODY.shoulderHalfWidth, 6);
    expect(s.sides[1].wrist[2]).toBeCloseTo(-BODY.shoulderHalfWidth, 6);
  });

  it("resolves root-, chest- and pelvis-relative and torso-local targets", () => {
    const targets: IkLimb["ik"][] = [
      { x: 20, y: 30, rel: "root" },
      { x: 20, y: 30, z: 5, rel: "root" },
      { x: 10, y: 40, z: 22, rel: "chest" },
      { x: 10, y: 40, z: 22, rel: "chest", local: true },
      { x: 30, y: 30, z: 20, rel: "pelvis" },
      { x: 25, y: -10, z: 20, rel: "pelvis", local: true },
    ];
    for (const torso of [0, 35, 80, -60]) {
      for (const ik of targets) {
        const pose = basePose({ torso, arms: [{ ik, pole: [-1, 0, 0.3] }] });
        const s = solvePose(pose);
        s.sides.forEach((side, i) => {
          const target = resolveIkTarget(ik, side.shoulder, i === 0 ? 1 : -1, s);
          // Only check targets the arm can actually reach.
          if (dist(side.shoulder, target) < BODY.upperArm + BODY.forearm - 0.02) {
            expectVec(side.wrist, target);
          }
        });
      }
    }
  });

  it("torso-local targets rotate with the torso", () => {
    const ik: IkLimb["ik"] = { x: 30, y: 20, z: 20, rel: "chest", local: true };
    const upright = solvePose(basePose({ torso: 0, arms: [{ ik, pole: [-1, 0, 0.3] }] }));
    const bent = solvePose(basePose({ torso: 90, arms: [{ ik, pole: [-1, 0, 0.3] }] }));
    // Same offset in torso axes → same distance from the chest in both poses.
    expect(dist(upright.sides[0].wrist, upright.chest)).toBeCloseTo(dist(bent.sides[0].wrist, bent.chest), 6);
    // Upright, "forward along the chest normal" is +x; face-down it points down (+y).
    expect(upright.sides[0].wrist[0] - upright.chest[0]).toBeCloseTo(30, 6);
    expect(bent.sides[0].wrist[1] - bent.chest[1]).toBeCloseTo(30, 6);
  });

  it("clamps an unreachable target and points the limb straight at it", () => {
    const s = solvePose(basePose({ arms: [{ ik: { x: 160, y: -200, z: 19 }, pole: [0, 0, 1] }] }));
    const { shoulder, wrist } = s.sides[0];
    expect(dist(shoulder, wrist)).toBeCloseTo(BODY.upperArm + BODY.forearm - 0.01, 6);
    expect(wrist[1]).toBeLessThan(shoulder[1] - 58);
  });

  it("keeps segment lengths for IK legs and places the foot from the tilt", () => {
    const s = solvePose(basePose({ legs: [{ ik: { x: 170, y: 240, z: 12 }, pole: [1, 0, 0.1], foot: 30 }] }));
    for (const side of s.sides) {
      expect(dist(side.hip, side.knee)).toBeCloseTo(BODY.thigh, 6);
      expect(dist(side.knee, side.ankle)).toBeCloseTo(BODY.shin, 6);
      expect(dist(side.ankle, side.toe)).toBeCloseTo(BODY.foot, 6);
      expect(dist(side.ankle, side.heel)).toBeCloseTo(BODY.heel, 6);
      // Positive tilt = toes down.
      expect(side.toe[1]).toBeGreaterThan(side.ankle[1]);
    }
  });
});

describe("solvePose: angle limbs", () => {
  const armAt = (angles: [number, number], spread?: [number, number]) =>
    solvePose(basePose({ arms: [{ angles, spread } satisfies AngleLimb] })).sides;

  it("0° points straight down, 90° forward, 180° up", () => {
    const [down] = armAt([0, 0]);
    expectVec(sub(down.elbow, down.shoulder), [0, BODY.upperArm, 0]);
    expectVec(sub(down.wrist, down.elbow), [0, BODY.forearm, 0]);

    const [forward] = armAt([90, 90]);
    expectVec(sub(forward.elbow, forward.shoulder), [BODY.upperArm, 0, 0]);
    expectVec(sub(forward.wrist, forward.elbow), [BODY.forearm, 0, 0]);

    const [up] = armAt([180, -180]);
    expectVec(sub(up.elbow, up.shoulder), [0, -BODY.upperArm, 0]);
    expectVec(sub(up.wrist, up.elbow), [0, -BODY.forearm, 0]);
  });

  it("spread swings each side outward, away from the midline", () => {
    const [near, far] = armAt([0, 0], [90, 90]);
    expectVec(sub(near.elbow, near.shoulder), [0, 0, BODY.upperArm]);
    expectVec(sub(far.elbow, far.shoulder), [0, 0, -BODY.upperArm]);
  });

  it("keeps segment lengths for any angles", () => {
    const r = rng(7);
    for (let n = 0; n < 200; n++) {
      const [side] = armAt([r.range(-180, 180), r.range(-180, 180)], [r.range(-90, 90), r.range(-90, 90)]);
      expect(dist(side.shoulder, side.elbow)).toBeCloseTo(BODY.upperArm, 6);
      expect(dist(side.elbow, side.wrist)).toBeCloseTo(BODY.forearm, 6);
      expect(dist(side.wrist, side.hand)).toBeCloseTo(BODY.hand, 6);
    }
  });

  it("footFollowsShin points the toes along the shin", () => {
    const s = solvePose(basePose({ legs: [{ angles: [0, 0], footFollowsShin: true }] }));
    const { ankle, toe } = s.sides[0];
    expect(toe[1] - ankle[1]).toBeGreaterThan(BODY.foot * 0.8);
  });
});

describe("solvePose: mirrored second limb", () => {
  const mirror = (v: Vec3): Vec3 => [v[0], v[1], -v[2]];
  const limbs: LimbSpec[] = [
    { angles: [30, 70], spread: [15, 5] },
    { ik: { x: 185, y: 120, z: 30 }, pole: [-1, 0.2, 0.3] },
    { ik: { x: 10, y: 50, z: 25, rel: "chest", local: true }, pole: [-1, 0, 0.3] },
  ];

  it.each(limbs.map((l) => [JSON.stringify(l), l] as const))("a single spec is mirrored across the midline: %s", (_, limb) => {
    const s = solvePose(basePose({ torso: 20, arms: [limb], legs: [{ ik: { x: 165, y: 245, z: 12 }, pole: [1, 0, 0.2], foot: 10 }] }));
    const [near, far] = s.sides;
    for (const key of ["shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle", "heel", "toe"] as const) {
      expectVec(far[key], mirror(near[key]));
    }
  });

  it("an explicit second spec is used for the far limb", () => {
    const s = solvePose(basePose({ arms: [{ angles: [0, 0] }, { angles: [90, 90] }] }));
    expect(s.sides[0].wrist[1]).toBeGreaterThan(s.sides[1].wrist[1] + 20);
  });

  it("an explicit second spec equal to the first gives the same result as a single spec", () => {
    const arm: LimbSpec = { ik: { x: 180, y: 110, z: 25 }, pole: [-1, 0.2, 0.3] };
    const one = solvePose(basePose({ arms: [arm] }));
    const two = solvePose(basePose({ arms: [arm, arm] }));
    expect(two).toEqual(one);
  });
});

describe("solvePose: frames", () => {
  function expectOrthonormal(name: string, axes: Vec3[]) {
    axes.forEach((a, i) => expect(len(a), `${name}[${i}] length`).toBeCloseTo(1, 9));
    for (let i = 0; i < axes.length; i++) {
      for (let j = i + 1; j < axes.length; j++) {
        expect(Math.abs(dot(axes[i], axes[j])), `${name}[${i}]·${name}[${j}]`).toBeLessThan(EPS);
      }
    }
  }

  it("pelvis, chest and head frames are orthonormal and right-handed for any lean, twist and head pitch", () => {
    const r = rng(3);
    for (let n = 0; n < 300; n++) {
      const s: Skeleton = solvePose(basePose({ torso: r.range(-180, 180), twist: r.range(-60, 60), head: r.range(-60, 60) }));
      expectOrthonormal("pelvis", [s.up, s.forward, [0, 0, 1]]);
      expectOrthonormal("chest", [s.up, s.chestForward, s.chestSide]);
      expectOrthonormal("head", [s.headUp, s.headForward, s.chestSide]);
      // Consistent handedness: forward × up points along +z for the pelvis frame.
      expect(cross(s.forward, s.up)[2]).toBeCloseTo(-1, 9);
    }
  });

  it("torso 0 is upright, 90 face-down, -90 face-up", () => {
    const upright = solvePose(basePose({ torso: 0 }));
    expectVec(upright.up, [0, -1, 0]);
    expectVec(upright.forward, [1, 0, 0]);
    const faceDown = solvePose(basePose({ torso: 90 }));
    expectVec(faceDown.up, [1, 0, 0]);
    expectVec(faceDown.forward, [0, 1, 0]);
    const faceUp = solvePose(basePose({ torso: -90 }));
    expectVec(faceUp.up, [-1, 0, 0]);
    expectVec(faceUp.forward, [0, -1, 0]);
  });

  it("places chest, neck and head along the spine", () => {
    const s = solvePose(basePose({ torso: 30 }));
    expect(dist(s.pelvis, s.chest)).toBeCloseTo(BODY.torso, 9);
    expect(dist(s.neck, s.head)).toBeCloseTo(BODY.neck + BODY.headRadius, 9);
    s.sides.forEach((side) => {
      expect(dist(side.shoulder, s.chest)).toBeCloseTo(BODY.shoulderHalfWidth, 9);
    });
  });
});

describe("solvePose: whole-body orient", () => {
  const pose = basePose({ torso: 25, arms: [{ ik: { x: 185, y: 120, z: 30 }, pole: [-1, 0.2, 0.3] }] });
  const plain = solvePose(pose);
  const joints = (s: Skeleton) => namedJoints(s).map(([, p]) => p);

  it("is a rigid rotation about the pelvis (IK is solved before rotating)", () => {
    for (const orient of [{ roll: 90 }, { yaw: 90 }, { roll: -35, yaw: 180 }]) {
      const s = solvePose({ ...pose, orient });
      expectVec(s.pelvis, plain.pelvis);
      const a = joints(plain);
      const b = joints(s);
      for (let i = 0; i < a.length; i++) {
        for (let j = i + 1; j < a.length; j++) expect(dist(b[i], b[j]), JSON.stringify(orient)).toBeCloseTo(dist(a[i], a[j]), 6);
      }
    }
  });

  it("roll brings the near (+z) side down; yaw turns the facing direction from +x toward +z", () => {
    const rolled = solvePose({ ...pose, orient: { roll: 90 } });
    expect(rolled.sides[0].hip[1]).toBeGreaterThan(rolled.sides[1].hip[1] + 15);
    const turned = solvePose({ ...pose, orient: { yaw: 90 } });
    // The fixture leans 25°, so forward = (cos 25°, sin 25°, 0) before turning.
    expect(turned.forward[2]).toBeCloseTo(plain.forward[0], 6);
    expect(turned.forward[0]).toBeCloseTo(0, 6);
    expect(turned.forward[1]).toBeCloseTo(plain.forward[1], 6);
  });

  it("no orient and a zero orient give the same skeleton", () => {
    expect(solvePose({ ...pose, orient: { roll: 0, yaw: 0 } })).toEqual(plain);
  });
});

describe("solvePose: random valid poses", () => {
  const r = rng(42);
  const randomLimb = (arm: boolean): LimbSpec => {
    if (r.next() < 0.5) {
      return {
        angles: [r.range(-180, 180), r.range(-180, 180)],
        spread: r.next() < 0.5 ? [r.range(-45, 90), r.range(-45, 90)] : undefined,
        foot: arm ? undefined : r.range(-30, 90),
        footFollowsShin: arm ? undefined : r.next() < 0.3,
      };
    }
    const rel = r.pick(["world", "root", "chest", "pelvis"] as const);
    return {
      ik: {
        x: rel === "world" ? r.range(60, 260) : r.range(-70, 70),
        y: rel === "world" ? r.range(0, 250) : r.range(-70, 70),
        z: r.next() < 0.7 ? r.range(0, 60) : undefined,
        rel,
        local: rel !== "world" && r.next() < 0.5,
      },
      pole: [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)],
      foot: arm ? undefined : r.range(-30, 90),
    };
  };

  it("never produces NaN or Infinity", () => {
    for (let n = 0; n < 2000; n++) {
      const pose: Pose = {
        hip: [r.range(80, 240), r.range(80, 245)],
        torso: r.range(-180, 180),
        head: r.range(-45, 45),
        twist: r.range(-45, 45),
        arms: r.next() < 0.5 ? [randomLimb(true)] : [randomLimb(true), randomLimb(true)],
        legs: r.next() < 0.5 ? [randomLimb(false)] : [randomLimb(false), randomLimb(false)],
      };
      const s = solvePose(pose);
      const bad = skeletonNumbers(s).filter(([, v]) => !Number.isFinite(v));
      expect(bad, JSON.stringify(pose)).toEqual([]);
      // Bones keep their length whatever the input.
      for (const side of s.sides) {
        expect(dist(side.shoulder, side.elbow)).toBeCloseTo(BODY.upperArm, 5);
        expect(dist(side.elbow, side.wrist)).toBeCloseTo(BODY.forearm, 5);
        expect(dist(side.hip, side.knee)).toBeCloseTo(BODY.thigh, 5);
        expect(dist(side.knee, side.ankle)).toBeCloseTo(BODY.shin, 5);
      }
      expect(namedJoints(s)).toHaveLength(22);
    }
  });
});
