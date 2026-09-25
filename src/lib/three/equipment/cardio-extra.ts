import * as THREE from "three";
import {
  Cable,
  Kit,
  TAU,
  Ticker,
  at,
  beam,
  bentTube,
  block,
  circlePath,
  cyl,
  damp,
  extrude,
  mesh,
  node,
  roundedPolygon,
  settleAngle,
  v3,
} from "./helpers";
import type { EquipmentModel } from "./index";
import { capsuleHull, screen } from "./cardio";
import { knob, rubberFoot, wheel } from "./parts";

const Z = v3(0, 0, 1);

/** Console head facing +x, tilted back by `tilt`; returns the group and screen material. */
function consoleHead(kit: Kit, x: number, y: number, tilt: number, width = 0.5) {
  const { m } = kit;
  const g = node(kit.root, x, y, 0);
  g.rotation.z = tilt;
  block(g, -0.02, 0, 0, 0.08, 0.22, width, m.plastic, 0.03);
  const mat = screen(kit, "cardio");
  const scr = mesh(new THREE.PlaneGeometry(0.26, 0.15), mat, g);
  at(scr, 0.0205, 0.01, 0, 0, Math.PI / 2, 0);
  scr.castShadow = false;
  for (const s of [1, -1]) {
    for (let i = 0; i < 2; i++) block(g, 0.02, 0.04 - i * 0.07, s * (width / 2 - 0.07), 0.01, 0.045, 0.06, i ? m.plasticLight : m.accent, 0.008);
  }
  return { g, mat };
}

/** Flywheel disc with lightening holes, turning about local z. */
function holedDisc(kit: Kit, parent: THREE.Object3D, r: number, holes = 5) {
  const disc = new THREE.Shape();
  disc.absarc(0, 0, r, 0, TAU, false);
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * TAU;
    disc.holes.push(circlePath(r * 0.18, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55));
  }
  mesh(extrude(disc, 0.006, 0.002, 32, 1), kit.m.steel, parent);
  at(mesh(cyl(r * 0.2, 0.02, 20), kit.m.accent, parent), 0, 0, 0, Math.PI / 2);
}

// --------------------------------------------------------------- elliptical

/** Rear-drive elliptical: pedal arms run from the crank to rollers on a front ramp. */
export function elliptical(): EquipmentModel {
  const kit = new Kit("elliptical");
  const { m, root } = kit;
  beam(root, v3(-0.9, 0.04, 0), v3(0.9, 0.04, 0), 0.14, 0.06, m.frameDark);
  for (const x of [-0.86, 0.84]) {
    beam(root, v3(x, 0.035, -0.3), v3(x, 0.035, 0.3), 0.07, 0.05, m.frameDark);
    for (const s of [1, -1]) rubberFoot(root, x, s * 0.27, 0.03, 0.008);
  }
  // Rear drive shroud with the flywheel showing through side windows.
  const C = v3(0.62, 0.42, 0);
  const shroud = mesh(
    extrude(roundedPolygon([[0.36, 0.07], [0.9, 0.07], [0.9, 0.52], [0.72, 0.66], [0.44, 0.6]], [0.04, 0.05, 0.12, 0.1, 0.08]), 0.14, 0.015, 8, 2),
    m.plastic,
    root,
  );
  shroud.position.z = 0;
  const fly = kit.part(root, C.x, C.y, 0);
  for (const s of [1, -1]) {
    const face = node(fly, 0, 0, s * 0.088);
    holedDisc(kit, face, 0.13);
    mesh(new THREE.TorusGeometry(0.135, 0.006, 8, 40), m.plasticLight, root).position.set(C.x, C.y, s * 0.087);
  }
  const crank = kit.part(root, C.x, C.y, 0);
  at(mesh(cyl(0.02, 0.3, 16), m.steel, crank), 0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) block(crank, 0.075 * s, 0, s * 0.12, 0.2, 0.035, 0.014, m.steel, 0.006);

  // Ramp for the pedal-arm rollers.
  const r = v3(-1, 0.2, 0).normalize();
  const Q0 = v3(-0.28, 0.12, 0);
  for (const s of [1, -1]) beam(root, Q0.clone().addScaledVector(r, -0.32).setZ(s * 0.13), Q0.clone().addScaledVector(r, 0.3).setZ(s * 0.13), 0.05, 0.03, m.aluminium, v3(-r.y, r.x, 0));
  beam(root, v3(-0.1, 0.06, 0), Q0.clone().addScaledVector(r, -0.3).add(v3(0, -0.02, 0)), 0.06, 0.05, m.frameDark, Z);
  const La = 0.95;
  const arms = [1, -1].map((s) => {
    const a = kit.part(root);
    beam(a, v3(0, 0, 0), v3(La, 0, 0), 0.04, 0.05, m.frame);
    at(wheel(a, 0.032, 0.03), La, -0.01, 0);
    const pedal = node(a, 0.42, 0.045, 0);
    block(pedal, 0, 0, 0, 0.36, 0.025, 0.15, m.plastic, 0.01);
    block(pedal, 0, 0.014, 0, 0.32, 0.006, 0.12, m.grip, 0.003);
    block(pedal, 0.17, 0.03, 0, 0.03, 0.04, 0.15, m.plastic, 0.01);
    a.userData.side = s;
    return a;
  });

  // Moving handles on pivots at the front column, and the console.
  beam(root, v3(-0.78, 0.06, 0), v3(-0.62, 1.3, 0), 0.1, 0.07, m.frame, Z);
  const cons = consoleHead(kit, -0.6, 1.38, 0.42);
  mesh(bentTube([v3(-0.56, 1.12, -0.2), v3(-0.5, 1.14, -0.12), v3(-0.5, 1.14, 0.12), v3(-0.56, 1.12, 0.2)], 0.016, 0.04), m.grip, root);
  beam(root, v3(-0.62, 0.98, -0.28), v3(-0.62, 0.98, 0.28), 0.05, 0.05, m.frameDark);
  const handles = [1, -1].map((s) => {
    const h = kit.part(root, -0.62, 0.98, s * 0.3);
    mesh(bentTube([v3(-0.02, -0.5, 0), v3(0, 0, 0), v3(0.1, 0.5, 0.0), v3(0.12, 0.66, 0)], 0.018, 0.1), m.frame, h);
    const g = mesh(cyl(0.022, 0.26, 16), m.grip, h);
    g.position.set(0.105, 0.54, 0);
    g.rotation.z = -0.15;
    h.userData.side = s;
    return h;
  });

  const P = new THREE.Vector3();
  const F = new THREE.Vector3();
  const pose = (theta: number) => {
    for (const a of arms) {
      const s = a.userData.side as number;
      const t = theta + (s > 0 ? 0 : Math.PI);
      P.set(C.x + Math.cos(t) * 0.15, C.y + Math.sin(t) * 0.15, s * 0.14);
      const q = Q0.clone().setZ(P.z).sub(P);
      const b = r.dot(q);
      const c = q.lengthSq() - La * La;
      const k = -b + Math.sqrt(Math.max(0, b * b - c));
      F.copy(Q0).setZ(P.z).addScaledVector(r, k);
      a.position.copy(P);
      a.rotation.set(0, 0, Math.atan2(F.y - P.y, F.x - P.x));
    }
    for (const h of handles) h.rotation.z = 0.3 * Math.sin(theta + (h.userData.side as number) * 0.5 * Math.PI + Math.PI / 2);
    crank.rotation.z = theta;
    fly.rotation.z = theta * 3;
  };
  pose(0);
  kit.spot("pedals", v3(0.3, 0.066, 0.078), arms[0]);
  kit.spot("handles", v3(0.105, 0.56, 0.022), handles[0]);
  kit.spot("console", v3(0.022, 0.03, 0.08), cons.g);
  kit.spot("flywheel", v3(C.x + 0.06, C.y + 0.05, 0.1));

  const tick = new Ticker();
  let theta = 0;
  let omega = 0;
  let on = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    omega = damp(omega, active ? 4.2 : 0, active ? 2 : 1.4, dt);
    theta += omega * dt;
    if (!active && omega < 0.2) theta = settleAngle(theta, 1.5, dt);
    on = damp(on, active ? 1 : 0, 3, dt);
    cons.mat.emissiveIntensity = 0.3 + 0.75 * on;
    pose(theta);
  });
}

// ------------------------------------------------------------ stair climber

/** Step mill: a revolving staircase between two side housings. */
export function stairClimber(): EquipmentModel {
  const kit = new Kit("stair-climber");
  const { m, root } = kit;
  const d = v3(-Math.SQRT1_2, Math.SQRT1_2, 0);
  const spacing = 0.283;
  const N = 6;
  const B = v3(0.56, 0.12, 0);
  beam(root, v3(-0.75, 0.035, 0), v3(0.78, 0.035, 0), 0.5, 0.05, m.frameDark);
  for (const [x, s] of [[-0.7, 1], [-0.7, -1], [0.72, 1], [0.72, -1]]) rubberFoot(root, x, s * 0.3, 0.03, 0.01);
  const side = roundedPolygon(
    [[0.72, 0.06], [-0.74, 0.06], [-0.74, 1.12], [-0.58, 1.42], [-0.44, 1.42], [0.36, 0.44], [0.72, 0.28]],
    [0.03, 0.03, 0.1, 0.06, 0.08, 0.1, 0.05],
  );
  for (const s of [1, -1]) {
    mesh(extrude(side, 0.03, 0.012, 8, 2), m.plastic, root).position.z = s * 0.36;
    const stripe = block(root, -0.1, 0.8, s * 0.39, 0.9, 0.02, 0.004, m.accent, 0.002);
    stripe.rotation.z = -Math.PI / 4;
    stripe.castShadow = false;
  }
  block(root, -0.45, 0.33, 0, 0.5, 0.54, 0.7, m.frameDark, 0.02);
  // Landing deck at the bottom and a top cover where the steps turn under.
  block(root, 0.6, 0.24, 0, 0.28, 0.04, 0.7, m.plastic, 0.01);
  block(root, 0.6, 0.264, 0, 0.24, 0.006, 0.66, m.grip, 0.003);
  const top = B.clone().addScaledVector(d, N * spacing);
  block(root, top.x - 0.02, top.y + 0.05, 0, 0.28, 0.1, 0.7, m.plastic, 0.02);

  const steps = Array.from({ length: N }, () => {
    const g = kit.part(root);
    block(g, -0.1, -0.015, 0, 0.24, 0.03, 0.6, m.frameDark, 0.005);
    block(g, -0.1, 0.002, 0, 0.22, 0.006, 0.58, m.grip, 0.002);
    block(g, 0.015, 0.001, 0, 0.02, 0.008, 0.58, m.accent, 0.002);
    block(g, 0.01, -0.12, 0, 0.012, 0.2, 0.6, m.frameDark, 0.003);
    return g;
  });
  const pose = (phase: number) => {
    steps.forEach((g, i) => {
      const p = (((i - phase) % N) + N) % N;
      g.position.copy(B).addScaledVector(d, p * spacing);
    });
  };
  pose(0);

  // Handrails along the incline and the console on top.
  for (const s of [1, -1]) {
    const z = s * 0.37;
    mesh(bentTube([v3(0.36, 0.62, z), v3(0.3, 1.05, z), v3(-0.42, 1.5, z)], 0.02, 0.1), m.frame, root);
    at(mesh(cyl(0.024, 0.34, 16), m.grip, root), -0.02, 1.27, z, 0, 0, Math.PI / 2 + 0.56);
  }
  const cons = consoleHead(kit, -0.52, 1.6, 0.5, 0.6);

  kit.spot("steps", v3(-0.1, 0.004, -0.1), steps[2]);
  kit.spot("handrails", v3(-0.02, 1.31, 0.37));
  kit.spot("console", v3(0.022, 0.03, 0.1), cons.g);

  const tick = new Ticker();
  let phase = 0;
  let speed = 0;
  let on = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    speed = damp(speed, active ? 1 : 0, 2, dt);
    if (active || speed > 0.05) phase += speed * dt;
    else phase = damp(phase, Math.ceil(phase / N - 1e-6) * N, 2, dt);
    on = damp(on, active ? 1 : 0, 3, dt);
    cons.mat.emissiveIntensity = 0.3 + 0.75 * on;
    pose(phase);
  });
}

// ----------------------------------------------------------------- air bike

/** Fan bike: pedals and push-pull handles both drive a big bladed fan. */
export function airBike(): EquipmentModel {
  const kit = new Kit("air-bike");
  const { m, root } = kit;
  const F = v3(-0.52, 0.6, 0);
  const R = 0.33;
  const BB = v3(0.08, 0.34, 0);
  beam(root, v3(-0.62, 0.05, 0), v3(0.6, 0.05, 0), 0.08, 0.05, m.frameDark);
  for (const [x, half] of [[-0.62, 0.3], [0.58, 0.27]]) {
    beam(root, v3(x, 0.045, -half), v3(x, 0.045, half), 0.08, 0.06, m.frameDark, undefined, 0.012);
    for (const s of [1, -1]) rubberFoot(root, x, s * (half - 0.03), 0.025, 0.016);
  }
  for (const s of [1, -1]) at(wheel(root, 0.04, 0.03), -0.7, 0.045, s * 0.24);
  const spine = new THREE.CatmullRomCurve3([v3(0.48, 0.06, 0), v3(0.2, 0.26, 0), v3(0.0, 0.46, 0), v3(-0.22, 0.72, 0), v3(-0.3, 0.98, 0)]);
  mesh(new THREE.TubeGeometry(spine, 48, 0.042, 18), m.frameDark, root);
  mesh(bentTube([v3(0.05, 0.4, 0), v3(0.27, 0.78, 0)], 0.035, 0), m.frameDark, root);
  beam(root, v3(0.26, 0.74, 0), v3(0.34, 0.93, 0), 0.042, 0.042, m.steel, Z);
  at(knob(root, 0.016), 0.24, 0.76, 0, 0, 0, Math.PI / 2 + 0.36);
  const saddle = node(root, 0.36, 0.96, 0);
  const shape = roundedPolygon(
    [[-0.15, 0], [-0.12, -0.035], [0.0, -0.06], [0.09, -0.1], [0.14, 0], [0.09, 0.1], [0.0, 0.06], [-0.12, 0.035]],
    [0.02, 0.03, 0.08, 0.04, 0.05, 0.04, 0.08, 0.03],
  );
  at(mesh(extrude(shape, 0.03, 0.02, 10, 4), m.pad, saddle), 0, 0.03, 0, -Math.PI / 2);
  // Fork to the fan axle, footpegs, and a console mast.
  for (const s of [1, -1]) {
    beam(root, v3(-0.2, 0.7, s * 0.1), v3(F.x, F.y, s * 0.1), 0.05, 0.014, m.frameDark, Z);
    beam(root, v3(F.x, F.y, s * 0.1), v3(-0.62, 0.07, s * 0.1), 0.05, 0.014, m.frameDark, Z);
    at(mesh(cyl(0.016, 0.1, 12), m.grip, root), F.x + 0.12, F.y - 0.12, s * 0.16, Math.PI / 2);
  }
  at(mesh(cyl(0.014, 0.24, 12), m.steel, root), F.x, F.y, 0, Math.PI / 2);
  mesh(bentTube([v3(-0.3, 0.98, 0), v3(-0.34, 1.12, 0)], 0.02, 0), m.frameDark, root);
  const lcd = node(root, -0.33, 1.16, 0);
  lcd.rotation.z = 0.5;
  block(lcd, 0, 0, 0, 0.035, 0.1, 0.16, m.plastic, 0.01);
  const lcdMat = screen(kit, "bike");
  at(mesh(new THREE.PlaneGeometry(0.13, 0.075), lcdMat, lcd), 0.018, 0.005, 0, 0, Math.PI / 2, 0).castShadow = false;
  // Fan: blades with an outer ring, spinning inside the fork.
  const fan = kit.part(root, F.x, F.y, 0);
  at(mesh(cyl(0.06, 0.1, 24), m.plastic, fan), 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const arm = node(fan);
    arm.rotation.z = -a;
    const blade = block(arm, 0, 0.19, 0, 0.012, 0.25, 0.12, m.plasticLight, 0.004);
    blade.rotation.y = 0.45;
  }
  for (const s of [1, -1]) mesh(new THREE.TorusGeometry(R - 0.01, 0.01, 8, 48), m.frameDark, fan).position.z = s * 0.065;
  const guard = mesh(extrude(capsuleHull(new THREE.Vector2(BB.x, BB.y), 0.12, new THREE.Vector2(F.x, F.y), 0.07), 0.018, 0.008, 8, 2), m.plastic, root);
  guard.position.z = 0.13;
  // Cranks, pedals, and push-pull handles linked to the cranks.
  const crank = kit.part(root, BB.x, BB.y, 0);
  at(mesh(cyl(0.02, 0.34, 16), m.steel, crank), 0, 0, 0, Math.PI / 2);
  const pedals = [1, -1].map((s) => {
    const arm = node(crank, 0, 0, s * 0.16);
    arm.rotation.z = s > 0 ? 0 : Math.PI;
    block(arm, 0, -0.085, 0, 0.035, 0.2, 0.014, m.steel, 0.006);
    const pedal = kit.part(arm, 0, -0.17, s * 0.05);
    at(mesh(cyl(0.008, 0.1, 10), m.steel, pedal), 0, 0, 0, Math.PI / 2);
    block(pedal, 0, 0, s * 0.02, 0.11, 0.024, 0.1, m.plastic, 0.006);
    block(pedal, 0.05, 0, s * 0.02, 0.008, 0.012, 0.07, m.accent, 0.003);
    return pedal;
  });
  const handles = [1, -1].map((s) => {
    const h = kit.part(root, -0.26, 0.74, s * 0.22);
    mesh(bentTube([v3(0.02, -0.22, 0), v3(0, 0, 0), v3(0.1, 0.36, 0), v3(0.12, 0.56, 0)], 0.02, 0.08), m.frameDark, h);
    const g = mesh(cyl(0.024, 0.24, 16), m.grip, h);
    g.position.set(0.11, 0.45, 0);
    g.rotation.z = -0.1;
    h.userData.side = s;
    return h;
  });
  at(mesh(cyl(0.022, 0.5, 16), m.steel, root), -0.26, 0.74, 0, Math.PI / 2);
  const rods = handles.map(() => new Cable(root, 0.01, m.steel));

  const low = new THREE.Vector3();
  const pin = new THREE.Vector3();
  const pose = (theta: number) => {
    crank.rotation.z = -theta;
    for (const p of pedals) p.rotation.z = theta - p.parent!.rotation.z;
    fan.rotation.z = -theta * 4;
    handles.forEach((h, i) => {
      const s = h.userData.side as number;
      const t = -theta + (s > 0 ? 0 : Math.PI);
      h.rotation.z = 0.28 * Math.sin(t);
      low.set(0.02, -0.22, 0).applyEuler(h.rotation).add(h.position);
      pin.set(BB.x + Math.sin(t) * 0.1, BB.y - Math.cos(t) * 0.1, s * 0.2);
      rods[i].set(low, pin);
    });
  };
  pose(0);
  kit.spot("fan", v3(F.x - 0.1, F.y + R - 0.02, 0.075));
  kit.spot("handles", v3(0.11, 0.5, 0.024), handles[0]);
  kit.spot("pedals", v3(0, 0.013, 0.02), pedals[0]);
  kit.spot("seat", v3(0.38, 1.03, 0));

  const tick = new Ticker();
  let theta = 0;
  let omega = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    omega = damp(omega, active ? 5 : 0, active ? 2 : 1.3, dt);
    theta += omega * dt;
    if (!active && omega < 0.2) theta = settleAngle(theta, 1.5, dt);
    pose(theta);
  });
}
