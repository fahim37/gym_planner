import { Kit, Ticker, at, beam, block, cyl, damp, mesh, node, v3, wave } from "./helpers";
import type { EquipmentModel } from "./index";
import { knob, rectPad, rubberFoot, storageHorn } from "./parts";

const Z = v3(0, 0, 1);

// --------------------------------------------------------------- hack squat

/** 45° hack squat: the lifter stands on the platform, back on the sled pad. */
export function hackSquat(): EquipmentModel {
  const kit = new Kit("hack-squat");
  const { m, root } = kit;
  const a = Math.SQRT1_2;
  const u = v3(-a, a, 0);
  const e2 = v3(a, a, 0);
  const R0 = v3(0.3, 0.2, 0);
  const R = (s: number) => R0.clone().addScaledVector(u, s);
  const RZ = 0.2;
  for (const s of [1, -1]) {
    beam(root, v3(-0.98, 0.035, s * 0.36), v3(0.82, 0.035, s * 0.36), 0.08, 0.06, m.frame);
    for (const x of [-0.92, 0.76]) rubberFoot(root, x, s * 0.36, 0.03, 0.005);
    const b0 = R(0.02).addScaledVector(e2, -0.06).setZ(s * RZ);
    const b1 = R(1.58).addScaledVector(e2, -0.06).setZ(s * RZ);
    beam(root, b0, b1, 0.08, 0.05, m.frame, e2);
    beam(root, v3(b1.x, 0.06, s * RZ), v3(b1.x, b1.y + 0.02, s * RZ), 0.08, 0.08, m.frame, Z);
    beam(root, v3(b1.x, 0.06, s * RZ), v3(b1.x, 0.06, s * 0.36), 0.06, 0.05, m.frame);
    beam(root, v3(b0.x, 0.06, s * RZ), v3(b0.x, b0.y + 0.02, s * RZ), 0.07, 0.07, m.frame, Z);
    const r0 = R(0.05).setZ(s * RZ);
    const r1 = R(1.55).setZ(s * RZ);
    const rail = mesh(cyl(0.022, r0.distanceTo(r1), 20), m.chrome, root);
    rail.position.copy(r0).lerp(r1, 0.5);
    rail.quaternion.setFromUnitVectors(v3(0, 1, 0), u);
    // Notched safety bar beside each rail.
    const n0 = R(0.45).addScaledVector(e2, -0.03).setZ(s * (RZ + 0.055));
    const n1 = R(1.3).addScaledVector(e2, -0.03).setZ(s * (RZ + 0.055));
    beam(root, n0, n1, 0.012, 0.03, m.frameDark, e2);
    for (let i = 0; i < 10; i++) {
      const t = R(0.5 + 0.085 * i).setZ(s * (RZ + 0.055));
      const tooth = block(root, t.x, t.y, t.z, 0.03, 0.03, 0.012, m.frameDark, 0.003);
      tooth.rotation.z = -Math.PI / 4;
    }
  }
  for (const x of [-0.9, 0.2]) beam(root, v3(x, 0.05, -0.36), v3(x, 0.05, 0.36), 0.07, 0.04, m.frame);
  // Foot platform.
  const pf = node(root, 0.5, 0.2, 0);
  pf.rotation.z = 0.18;
  block(pf, 0, 0, 0, 0.5, 0.03, 0.74, m.frameDark, 0.008);
  block(pf, 0, 0.018, 0, 0.46, 0.006, 0.7, m.grip, 0.003);
  beam(root, v3(0.5, 0.06, 0), v3(0.5, 0.18, 0), 0.1, 0.1, m.frame, Z);

  // Sled: local +x runs down the rails, +y away from them towards the lifter.
  const sled = kit.part(root);
  sled.rotation.z = -Math.PI / 4;
  for (const s of [1, -1]) {
    for (const x of [-0.3, 0.2]) {
      at(mesh(cyl(0.04, 0.13, 20), m.frameDark, sled), x, 0, s * RZ, 0, 0, Math.PI / 2);
      block(sled, x, 0.035, s * RZ, 0.1, 0.05, 0.06, m.frameDark, 0.006);
    }
    storageHorn(sled, -0.08, 0.03, s * 0.23, s, [{ kind: "iron", kg: 20 }]);
    const sp = node(sled, -0.43, 0.24, s * 0.13);
    sp.rotation.z = -Math.PI / 2;
    rectPad(sp, 0.13, 0.13, 0.08, 0.04);
    beam(sled, v3(-0.45, 0.07, s * 0.13), v3(-0.45, 0.2, s * 0.13), 0.05, 0.05, m.frame, Z);
    beam(sled, v3(-0.4, 0.2, s * 0.2), v3(-0.4, 0.3, s * 0.27), 0.03, 0.03, m.frame);
    at(mesh(cyl(0.02, 0.12, 16), m.grip, sled), -0.34, 0.3, s * 0.27, 0, 0, Math.PI / 2);
  }
  block(sled, -0.05, 0.06, 0, 0.84, 0.02, 0.44, m.frame, 0.006);
  rectPad(node(sled, -0.02, 0.07, 0), 0.7, 0.38, 0.07, 0.07);
  const lever = kit.part(sled, -0.3, 0.07, 0.25);
  beam(lever, v3(0, 0, 0), v3(-0.02, 0.2, 0.04), 0.025, 0.02, m.frame);
  at(knob(lever, 0.016), -0.02, 0.2, 0.04, 0, 0, 0.1);

  const sRest = 0.94;
  const pose = (s: number, release: number) => {
    sled.position.copy(R(s));
    lever.rotation.z = -0.6 * release;
  };
  pose(sRest, 0);
  kit.spot("shoulder-pads", v3(-0.33, 0.3, 0.13), sled);
  kit.spot("platform", v3(0.52, 0.263, 0.24));
  kit.spot("sled", v3(0.33, 0.1, 0.19), sled);
  kit.spot("safety", v3(-0.02, 0.26, 0.04), lever);
  const tick = new Ticker();
  let s = sRest;
  let release = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    release = damp(release, active ? 1 : 0, 4, dt);
    s = damp(s, active ? sRest - 0.48 * release * wave(time, 3.6) : sRest, 5, dt);
    pose(s, release);
  });
}

// --------------------------------------------------------- seated calf raise

export function seatedCalfRaise(): EquipmentModel {
  const kit = new Kit("seated-calf-raise");
  const { m, root } = kit;
  beam(root, v3(-0.62, 0.035, 0), v3(0.6, 0.035, 0), 0.1, 0.06, m.frame);
  for (const x of [-0.58, 0.56]) {
    beam(root, v3(x, 0.035, -0.3), v3(x, 0.035, 0.3), 0.07, 0.06, m.frame);
    for (const s of [1, -1]) rubberFoot(root, x, s * 0.26, 0.03, 0.005);
  }
  // Seat.
  beam(root, v3(-0.25, 0.06, 0), v3(-0.25, 0.39, 0), 0.07, 0.07, m.frame, Z);
  rectPad(node(root, -0.22, 0.39, 0), 0.36, 0.36, 0.07, 0.07);
  // Toe plate: a raised block the balls of the feet stand on.
  block(root, 0.3, 0.07, 0, 0.18, 0.08, 0.5, m.frameDark, 0.01);
  block(root, 0.3, 0.113, 0, 0.16, 0.006, 0.46, m.grip, 0.003);
  // Lever arm: pivot at the back, knee pad in the middle, plate horns at the front.
  const P = v3(-0.52, 0.72, 0);
  beam(root, v3(P.x, 0.06, 0), v3(P.x, P.y - 0.04, 0), 0.08, 0.08, m.frame, Z);
  beam(root, v3(0.52, 0.06, 0), v3(0.52, 0.5, 0), 0.06, 0.06, m.frame, Z);
  block(root, 0.52, 0.51, 0, 0.08, 0.02, 0.08, m.rubber, 0.005);
  const lever = kit.part(root, P.x, P.y, 0);
  at(mesh(cyl(0.04, 0.14, 20), m.frameDark, lever), 0, 0, 0, Math.PI / 2);
  beam(lever, v3(0, 0, 0), v3(1.08, 0, 0), 0.08, 0.06, m.frame);
  const kp = node(lever, 0.74, -0.03, 0);
  kp.rotation.x = Math.PI;
  rectPad(kp, 0.16, 0.42, 0.07, 0.06);
  for (const s of [1, -1]) storageHorn(lever, 1.04, 0, s * 0.04, s, [{ kind: "iron", kg: 20 }]);
  const release = kit.part(lever, 0.55, 0.03, 0.22);
  beam(release, v3(0, 0, 0), v3(0.05, 0.15, 0), 0.025, 0.02, m.frame);
  at(knob(release, 0.018), 0.05, 0.15, 0, 0, 0, -0.3);
  beam(lever, v3(0.55, 0, 0.03), v3(0.55, 0.03, 0.22), 0.03, 0.03, m.frame);

  const pose = (a: number, r: number) => {
    lever.rotation.z = a;
    release.rotation.z = -0.7 * r;
  };
  pose(0, 0);
  kit.spot("knee-pad", v3(0.82, -0.07, 0.12), lever);
  kit.spot("footplate", v3(0.3, 0.117, 0.16));
  kit.spot("release", v3(0.06, 0.2, 0), release);
  kit.spot("plate-horn", v3(1.04, 0.026, 0.3), lever);
  const tick = new Ticker();
  let a = 0;
  let r = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    r = damp(r, active ? 1 : 0, 4, dt);
    a = damp(a, active ? 0.1 * r * wave(time, 2.2) : 0, 7, dt);
    pose(a, r);
  });
}
