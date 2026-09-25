import * as THREE from "three";
import {
  Cable,
  Kit,
  Ticker,
  at,
  beam,
  bentTube,
  block,
  cyl,
  damp,
  decal,
  extrude,
  mesh,
  node,
  roundedPolygon,
  v3,
  wave,
} from "./helpers";
import type { EquipmentModel } from "./index";
import { BRAND, holeStrip, textLabel } from "./materials";
import {
  dHandle,
  knob,
  loadPlates,
  pulley,
  rectPad,
  roller,
  rubberFoot,
  shaft,
  sleeve,
  storageHorn,
  weightStack,
  type WeightStack,
} from "./parts";

const Z = v3(0, 0, 1);

interface Tower {
  stack: WeightStack;
  /** Stack base position in model space. */
  base: THREE.Vector3;
  /** Model-space cable attachment on the head plate, for a given lift. */
  head(lift: number, out?: THREE.Vector3): THREE.Vector3;
  lift(h: number): void;
}

/**
 * Selectorized stack between two posts (±`halfW` along z) with a base plate,
 * a top crossmember at `height` and a branded back panel.
 */
function stackTower(kit: Kit, x: number, z: number, height: number, plates = 15, pinFromTop = 6, halfW = 0.22): Tower {
  const { m, root } = kit;
  const post = 0.08;
  for (const s of [1, -1]) {
    beam(root, v3(x, 0, z + s * halfW), v3(x, height, z + s * halfW), post, post, m.frame, Z, 0.006);
    beam(root, v3(x - 0.3, 0.03, z + s * halfW), v3(x + 0.3, 0.03, z + s * halfW), 0.08, 0.06, m.frame);
    for (const dx of [-0.26, 0.26]) rubberFoot(root, x + dx, z + s * halfW, 0.03, 0.004);
  }
  block(root, x, 0.03, z, 0.26, 0.05, 2 * halfW - post, m.frame, 0.004);
  beam(root, v3(x, height - post / 2, z - halfW - post / 2), v3(x, height - post / 2, z + halfW + post / 2), post, post, m.frame, undefined, 0.006);
  const rodTop = height - post - 0.02;
  block(root, x, rodTop + 0.02, z, 0.12, 0.04, 2 * halfW - post, m.frame, 0.004);
  block(root, x - 0.1, height / 2, z, 0.012, height - 0.2, 2 * halfW - post - 0.01, m.frameDark, 0.003);
  const stripe = block(root, x - 0.093, height * 0.72, z, 0.004, 0.05, 2 * halfW - post - 0.012, m.accent, 0.001);
  stripe.castShadow = false;
  const label = decal(root, textLabel(BRAND, "#e4e4e7", 512, 96, "bold italic 70px sans-serif"), 0.3, 0.056);
  at(label, x - 0.093, height * 0.72 + 0.08, z, 0, Math.PI / 2, 0);
  const g = node(root, x, 0.055, z);
  const stack = weightStack(g, plates, 5, pinFromTop, rodTop - 0.055);
  return {
    stack,
    base: g.position.clone(),
    head: (lift, out = new THREE.Vector3()) => out.set(x, 0.055 + stack.top + lift, z),
    lift: (h) => {
      stack.moving.position.y = h;
    },
  };
}

// ---------------------------------------------------------- cable crossover

export function cableMachine(): EquipmentModel {
  const kit = new Kit("cable-machine");
  const { m, root } = kit;
  const height = 2.36;
  const towers = [1, -1].map((s) => {
    const zc = s * 1.5;
    const tower = stackTower(kit, -0.05, zc, height, 16, 6);
    // Vertical pulley track on the inner side, numbered positions.
    const trackZ = zc - s * 0.36;
    const tx = 0.03;
    beam(root, v3(tx, 0.06, trackZ), v3(tx, height - 0.12, trackZ), 0.07, 0.07, m.frame, Z, 0.006);
    for (const y of [0.1, height - 0.2]) beam(root, v3(tx - 0.05, y, zc - s * 0.26), v3(tx, y, trackZ), 0.05, 0.05, m.frame);
    const strip = decal(root, holeStrip(20, true), 0.068, 1.6);
    at(strip, tx + 0.0356, 1.15, trackZ, 0, Math.PI / 2, 0);
    // Carriage with pop-pin and swivel pulley.
    const cy = 1.78;
    block(root, tx + 0.005, cy, trackZ, 0.1, 0.17, 0.1, m.frameDark, 0.01);
    at(knob(root, 0.017), tx + 0.055, cy + 0.03, trackZ, 0, 0, -Math.PI / 2);
    const swivel = node(root, tx + 0.03, cy - 0.1, trackZ - s * 0.075);
    beam(root, v3(tx + 0.03, cy - 0.06, trackZ - s * 0.04), v3(tx + 0.03, cy - 0.06, trackZ - s * 0.09), 0.03, 0.03, m.frameDark);
    block(swivel, 0, 0.02, 0, 0.03, 0.05, 0.03, m.steel, 0.004);
    const p3 = pulley(swivel, 0.042);
    p3.group.position.y = -0.05;
    p3.group.rotation.y = Math.PI / 2;
    const c3 = v3(tx + 0.03, cy - 0.15, trackZ - s * 0.075);
    // Top pulleys route the cable from the stack across to the track.
    const r = 0.045;
    const c1 = v3(-0.05, height - 0.2, zc - s * r);
    const c2 = v3(tx, height - 0.2, trackZ + s * r);
    for (const c of [c1, c2]) {
      const p = pulley(root, r);
      p.group.position.copy(c);
      p.group.rotation.y = Math.PI / 2;
    }
    const cables = [new Cable(root), new Cable(root), new Cable(root)];
    cables[1].set(v3(c1.x, c1.y + r, c1.z), v3(c2.x, c2.y + r, c2.z));
    const handle = kit.part(root);
    dHandle(handle);
    const ball = mesh(new THREE.SphereGeometry(0.02, 16, 10), m.rubber, handle);
    ball.position.y = 0.05;
    return { s, zc, tower, c1, c3, cables, handle, restLen: 0.16 };
  });

  // Top frame joining the towers, with a pull-up bar in front.
  beam(root, v3(-0.05, height - 0.04, -1.28), v3(-0.05, height - 0.04, 1.28), 0.08, 0.08, m.frame, undefined, 0.006);
  for (const z of [-0.9, 0.9]) beam(root, v3(-0.05, height - 0.06, z), v3(0.2, height - 0.12, z), 0.05, 0.05, m.frame);
  const bar = mesh(cyl(0.016, 1.9, 20), m.knurl, root);
  at(bar, 0.2, height - 0.12, 0, Math.PI / 2);

  const pose = (k: number) => {
    for (const t of towers) {
      // Crossover fly: handles sweep from the pulleys to meet in front of the chest.
      const rest = t.c3.clone().add(v3(0, -t.restLen, 0));
      const fly = v3(0.62, 1.22, t.s * 0.14);
      const mid = rest.clone().lerp(fly, 0.5).add(v3(0.25, 0.05, 0));
      const a = rest.clone().lerp(mid, k);
      const b = mid.clone().lerp(fly, k);
      const h = a.lerp(b, k);
      const dir = t.c3.clone().sub(h).normalize();
      t.handle.position.copy(h);
      t.handle.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
      const out = t.c3.distanceTo(h) - t.restLen;
      const lift = Math.max(0, out / 2);
      t.tower.lift(lift);
      const head = t.tower.head(lift);
      t.cables[0].set(head, v3(t.c1.x, t.c1.y, t.zc));
      t.cables[2].set(t.c3, h.clone().addScaledVector(dir, 0.03));
    }
  };
  pose(0);

  const right = towers[0];
  const stack = right.tower.stack;
  kit.spot("weight-stack", stack.face.clone().add(right.tower.base));
  kit.spot("pin", stack.pin, stack.moving);
  kit.spot("pulley", right.c3.clone().add(v3(0.03, 0, 0)));
  kit.spot("handle", v3(0.019, -0.14, 0.03), right.handle);

  const tick = new Ticker();
  let k = 0;
  return kit.finish((time, active) => {
    k = damp(k, active ? wave(time, 3.4) : 0, 6, tick.dt(time));
    pose(k);
  });
}

// ------------------------------------------------------------ lat pulldown

export function latPulldown(): EquipmentModel {
  const kit = new Kit("lat-pulldown");
  const { m, root } = kit;
  const sx = -0.55;
  const tower = stackTower(kit, sx, 0, 2.08, 15, 7);
  // Floor spine out to the seat, with a front foot.
  beam(root, v3(sx + 0.3, 0.035, 0), v3(0.62, 0.035, 0), 0.1, 0.06, m.frame);
  beam(root, v3(0.58, 0.035, -0.32), v3(0.58, 0.035, 0.32), 0.08, 0.06, m.frame);
  for (const z of [-0.28, 0.28]) rubberFoot(root, 0.58, z, 0.03, 0.005);

  // Boom from the tower top to the front pulley.
  const boomY = 2.1;
  beam(root, v3(sx - 0.06, boomY, 0), v3(0.42, boomY + 0.02, 0), 0.09, 0.1, m.frame, undefined, 0.008);
  beam(root, v3(sx, 2.04, 0), v3(sx + 0.35, boomY - 0.02, 0), 0.06, 0.06, m.frame);
  const r = 0.05;
  const c1 = v3(sx + r, 1.96, 0);
  const c2 = v3(0.3, 1.97, 0);
  for (const c of [c1, c2]) pulley(root, r).group.position.copy(c);
  const bx = c2.x + r;

  // Seat and thigh pads.
  beam(root, v3(0.4, 0.06, 0), v3(0.4, 0.42, 0), 0.07, 0.07, m.frame, Z);
  beam(root, v3(0.4, 0.3, 0), v3(0.4, 0.43, 0), 0.08, 0.08, m.frameDark, Z);
  at(knob(root), 0.44, 0.33, 0, 0, 0, -Math.PI / 2);
  rectPad(node(root, 0.42, 0.43, 0), 0.38, 0.36, 0.066, 0.08);
  beam(root, v3(0.12, 0.06, 0), v3(0.12, 0.64, 0), 0.06, 0.06, m.frame, Z);
  beam(root, v3(0.12, 0.5, 0), v3(0.12, 0.72, 0), 0.07, 0.07, m.frameDark, Z);
  at(knob(root), 0.155, 0.56, 0, 0, 0, -Math.PI / 2);
  const thighY = 0.745;
  beam(root, v3(0.12, thighY, -0.27), v3(0.12, thighY, 0.27), 0.03, 0.03, m.steel, undefined, 0.012);
  block(root, 0.12, 0.72, 0, 0.07, 0.06, 0.07, m.frameDark, 0.006);
  for (const z of [-0.14, 0.14]) roller(node(root, 0.12, thighY, z), 0.058, 0.2);

  // Wide grip bar on the cable.
  const bar = kit.part(root);
  const half = 0.32;
  beam(bar, v3(0, 0, -half), v3(0, 0, half), 0.026, 0.026, m.chrome, undefined, 0.012);
  for (const s of [1, -1]) {
    mesh(bentTube([v3(0, 0, s * (half - 0.02)), v3(0, 0, s * half), v3(0, -0.1, s * 0.6)], 0.0135, 0.05), m.chrome, bar);
    const dir = v3(0, -0.1, s * (0.6 - half)).normalize();
    const grip = mesh(cyl(0.019, 0.2, 18), m.grip, bar);
    grip.position.copy(v3(0, 0, s * half).addScaledVector(dir, 0.17));
    grip.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
  }
  block(bar, 0, 0.025, 0, 0.03, 0.05, 0.05, m.steel, 0.006);
  mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 16), m.steel, bar).position.y = 0.06;
  mesh(new THREE.SphereGeometry(0.022, 16, 10), m.rubber, bar).position.y = 0.1;

  const cables = [new Cable(root), new Cable(root), new Cable(root)];
  cables[1].set(v3(c1.x, c1.y + r, 0), v3(c2.x, c2.y + r, 0));
  const restY = 1.72;
  const pose = (travel: number) => {
    const y = restY - travel;
    bar.position.set(bx, y, 0);
    tower.lift(travel);
    cables[0].set(tower.head(travel), v3(sx, c1.y, 0));
    cables[2].set(v3(bx, c2.y, 0), v3(bx, y + 0.12, 0));
  };
  pose(0);

  const stack = tower.stack;
  kit.spot("bar", v3(0, -0.044, 0.5), bar);
  kit.spot("thigh-pad", v3(0.12, thighY + 0.059, 0.16));
  kit.spot("seat", v3(0.46, 0.513, 0));
  kit.spot("weight-stack", stack.face.clone().add(tower.base));
  kit.spot("pin", stack.pin, stack.moving);

  const tick = new Ticker();
  let travel = 0;
  return kit.finish((time, active) => {
    travel = damp(travel, active ? 0.58 * wave(time, 3.2) : 0, 6, tick.dt(time));
    pose(travel);
  });
}

// ------------------------------------------------------------ smith machine

export function smithMachine(): EquipmentModel {
  const kit = new Kit("smith-machine");
  const { m, root } = kit;
  const X = 0.55;
  const ZU = 0.8;
  const ZR = 0.7;
  const T = 0.08;
  const H = 2.2;
  for (const z of [-ZU, ZU]) {
    beam(root, v3(-0.76, 0.035, z), v3(0.76, 0.035, z), T, 0.06, m.frame);
    for (const x of [-0.7, 0.7]) rubberFoot(root, x, z, 0.03, 0.005);
    for (const x of [-X, X]) beam(root, v3(x, 0.06, z), v3(x, H, z), T, T, m.frame, Z, 0.006);
    beam(root, v3(-X, H - T / 2, z), v3(X, H - T / 2, z), T, T, m.frame, undefined, 0.006);
    // Rail mounts, top and bottom.
    const s = Math.sign(z);
    block(root, 0, H - 0.07, s * (ZR + ZU) / 2, 0.07, 0.05, ZU - ZR + 0.02, m.frame, 0.005);
    block(root, 0, 0.04, s * (ZR + ZU) / 2, 0.08, 0.05, ZU - ZR + 0.04, m.frame, 0.005);
  }
  for (const x of [-X, X]) beam(root, v3(x, H - T / 2, -ZU - T / 2), v3(x, H - T / 2, ZU + T / 2), T, T, m.frame, undefined, 0.006);
  beam(root, v3(-X, 0.035, -ZU), v3(-X, 0.035, ZU), T, 0.06, m.frame);

  // Plate storage on the rear uprights.
  storageHorn(root, -X, 0.3, ZU + T / 2, 1, [{ kind: "bumper", kg: 20 }, { kind: "bumper", kg: 15 }]);
  storageHorn(root, -X, 0.86, ZU + T / 2, 1, [{ kind: "iron", kg: 10 }, { kind: "iron", kg: 5 }]);
  storageHorn(root, -X, 0.3, -ZU - T / 2, -1, [{ kind: "bumper", kg: 10 }, { kind: "bumper", kg: 10 }]);

  const railR = 0.019;
  const stopY = 0.46;
  const pegs: number[] = Array.from({ length: 15 }, (_, k) => 0.461 + 0.1 * k);
  for (const s of [1, -1]) {
    const z = s * ZR;
    mesh(cyl(railR, H - 0.12, 20), m.chrome, root).position.set(0, 0.06 + (H - 0.12) / 2, z);
    // Hook column: a flat bar with pegs the rotating hooks drop onto.
    const cz = s * (ZR - 0.085);
    block(root, -0.1, 1.09, cz, 0.06, 2.06, 0.012, m.frameDark, 0.003);
    for (const y of [0.04, H - 0.07]) block(root, -0.1, y, s * (ZU + ZR - 0.085) / 2, 0.05, 0.04, ZU - ZR + 0.085, m.frameDark, 0.004);
    for (const y of pegs) {
      const peg = mesh(cyl(0.008, 0.026, 10), m.steel, root);
      at(peg, -0.095, y, cz + s * 0.013, Math.PI / 2);
    }
    // Safety stop: collar, bumper and locking knob.
    mesh(cyl(0.032, 0.04, 20), m.steel, root).position.set(0, stopY - 0.02, z);
    mesh(cyl(0.037, 0.05, 20), m.rubber, root).position.set(0, stopY + 0.025, z);
    at(knob(root, 0.014), 0.032, stopY - 0.02, z, 0, 0, -Math.PI / 2);
  }

  // Guided bar: carriages on the rails, rotating hooks, plate sleeves.
  const bar = kit.part(root);
  const turn = kit.part(bar);
  shaft(turn, ZR - 0.045);
  const hookShape = roundedPolygon(
    [
      [0.03, 0.024],
      [-0.1, 0.024],
      [-0.125, 0.004],
      [-0.125, -0.03],
      [-0.108, -0.03],
      [-0.108, -0.006],
      [-0.02, -0.024],
      [0.03, -0.024],
    ],
    [0.02, 0.012, 0.008, 0.004, 0.004, 0.006, 0.01, 0.02],
  );
  for (const s of [1, -1]) {
    const hook = mesh(extrude(hookShape, 0.01, 0.002, 4, 1), m.frameDark, turn);
    hook.position.z = s * (ZR - 0.07);
    const carriage = mesh(cyl(0.04, 0.15, 24), m.frameDark, bar);
    carriage.position.z = s * ZR;
    for (const dy of [-0.075, 0.075]) mesh(cyl(0.028, 0.012, 20), m.uhmw, bar).position.set(0, dy, s * ZR);
    block(bar, 0, 0, s * (ZR - 0.05), 0.05, 0.06, 0.04, m.frameDark, 0.006);
    const side = node(bar, 0, 0, 0);
    side.rotation.y = s > 0 ? 0 : Math.PI;
    const inner = sleeve(side, ZR + 0.035, 1.08);
    loadPlates(side, inner + 0.002, [{ kind: "iron", kg: 10 }, { kind: "iron", kg: 5 }]);
  }
  const rackY = pegs[8] + 0.017;
  const pose = (y: number, hook: number) => {
    bar.position.set(0, y, 0);
    turn.rotation.z = hook;
  };
  pose(rackY, 0);

  kit.spot("bar", v3(0, 0.016, 0.1), bar);
  kit.spot("hooks", v3(-0.05, 0.028, -(ZR - 0.07)), turn);
  kit.spot("rails", v3(railR + 0.001, 1.9, ZR));
  kit.spot("safety-stops", v3(0.038, stopY + 0.03, ZR));

  const tick = new Ticker();
  let y = rackY;
  let hook = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    hook = damp(hook, active ? 0.7 : 0, 5, dt);
    const free = Math.min(1, hook / 0.6);
    y = damp(y, active ? rackY + 0.04 * free - 0.64 * free * wave(time, 3.6) : rackY, 5, dt);
    pose(y, hook);
  });
}

// --------------------------------------------------------------- leg press

export function legPress(): EquipmentModel {
  const kit = new Kit("leg-press");
  const { m, root } = kit;
  const a = Math.SQRT1_2;
  const u = v3(-a, a, 0);
  const e2 = v3(a, a, 0);
  const hip = v3(0.55, 0.45, 0);
  const rail0 = hip.clone().addScaledVector(e2, -0.3);
  const L = (s: number) => rail0.clone().addScaledVector(u, s);
  const RZ = 0.26;

  // Base and rail supports.
  for (const z of [-RZ, RZ]) {
    beam(root, v3(-0.95, 0.035, z), v3(1.28, 0.035, z), 0.08, 0.06, m.frame);
    for (const x of [-0.9, 1.22]) rubberFoot(root, x, z, 0.03, 0.005);
    const b0 = L(0.28).addScaledVector(e2, -0.06).setZ(z);
    const b1 = L(1.58).addScaledVector(e2, -0.06).setZ(z);
    beam(root, b0, b1, 0.08, 0.05, m.frame, e2);
    beam(root, v3(b0.x, 0.06, z), v3(b0.x, b0.y + 0.02, z), 0.08, 0.08, m.frame, Z);
    beam(root, v3(b1.x, 0.06, z), v3(b1.x, b1.y + 0.02, z), 0.08, 0.08, m.frame, Z);
    beam(root, v3(b1.x + 0.03, 0.3, z), v3(b0.x - 0.03, b0.y - 0.08, z), 0.05, 0.05, m.frame);
    // Rails with end bumpers.
    const r0 = L(0.3).setZ(z);
    const r1 = L(1.56).setZ(z);
    const rail = mesh(cyl(0.022, r0.distanceTo(r1), 20), m.chrome, root);
    rail.position.copy(r0).lerp(r1, 0.5);
    rail.quaternion.setFromUnitVectors(v3(0, 1, 0), u);
    for (const [s, mat] of [[0.33, m.rubber], [1.56, m.frameDark]] as const) {
      const p = mesh(cyl(0.034, 0.05, 20), mat, root);
      p.position.copy(L(s).setZ(z));
      p.quaternion.setFromUnitVectors(v3(0, 1, 0), u);
    }
  }
  for (const x of [-0.8, 0.12, 1.12]) beam(root, v3(x, 0.05, -RZ - 0.04), v3(x, 0.05, RZ + 0.04), 0.07, 0.04, m.frame);
  const top = L(1.58).addScaledVector(e2, -0.06);
  beam(root, v3(top.x, top.y, -RZ), v3(top.x, top.y, RZ), 0.07, 0.07, m.frame);

  // Seat: reclined backrest and a short seat pad meeting at the hip crease.
  const back = v3(Math.cos(0.66), Math.sin(0.66), 0);
  const nBack = v3(-back.y, back.x, 0);
  const seatDir = v3(-Math.cos(0.35), Math.sin(0.35), 0);
  const nSeat = v3(seatDir.y, -seatDir.x, 0);
  const bp = node(root);
  bp.position.copy(hip).addScaledVector(back, 0.39).addScaledVector(nBack, -0.085);
  bp.rotation.z = 0.66;
  rectPad(bp, 0.72, 0.46, 0.07, 0.09);
  const sp = node(root);
  sp.position.copy(hip).addScaledVector(seatDir, 0.17).addScaledVector(nSeat, -0.085);
  sp.rotation.z = -0.35;
  rectPad(sp, 0.34, 0.46, 0.07, 0.07);
  const pan = hip.clone().addScaledVector(nBack, -0.1);
  beam(root, pan.clone().addScaledVector(back, 0.05), pan.clone().addScaledVector(back, 0.7), 0.3, 0.04, m.frameDark, nBack);
  beam(root, hip.clone().addScaledVector(nSeat, -0.1).addScaledVector(seatDir, 0.3), hip.clone().addScaledVector(nSeat, -0.1), 0.3, 0.04, m.frameDark, nSeat);
  beam(root, v3(0.56, 0.06, 0), v3(0.56, 0.36, 0), 0.1, 0.1, m.frame, Z);
  const upper = hip.clone().addScaledVector(back, 0.62).addScaledVector(nBack, -0.12);
  beam(root, v3(upper.x + 0.05, 0.06, 0), upper, 0.08, 0.08, m.frame, Z);

  // Safety handles beside the seat.
  const handles = [1, -1].map((s) => {
    const h = kit.part(root, 0.66, 0.4, s * 0.33);
    mesh(cyl(0.03, 0.05, 16), m.frameDark, h).rotation.x = Math.PI / 2;
    beam(h, v3(0, 0, 0), v3(-0.1, 0.2, 0), 0.03, 0.025, m.frame);
    const grip = mesh(cyl(0.02, 0.12, 16), m.grip, h);
    at(grip, -0.1, 0.2, s * 0.05, Math.PI / 2);
    beam(root, v3(0.66, 0.06, s * 0.33), v3(0.66, 0.38, s * 0.33), 0.05, 0.05, m.frame, Z);
    return h;
  });

  // Sled: bearings on the rails, foot platform facing the seat, plate horns.
  const sled = kit.part(root);
  sled.rotation.z = -Math.PI / 4;
  for (const s of [1, -1]) {
    for (const x of [-0.05, -0.5]) {
      const b = mesh(cyl(0.042, 0.13, 20), m.frameDark, sled);
      at(b, x, 0, s * RZ, 0, 0, Math.PI / 2);
      block(sled, x, 0.045, s * RZ, 0.1, 0.05, 0.06, m.frameDark, 0.006);
    }
    beam(sled, v3(0.03, 0.08, s * 0.31), v3(-0.6, 0.08, s * 0.31), 0.05, 0.06, m.frame);
    beam(sled, v3(0.03, 0.6, s * 0.31), v3(-0.3, 0.1, s * 0.31), 0.045, 0.045, m.frame);
    for (const [x, load] of [
      [-0.13, [{ kind: "iron", kg: 20 }, { kind: "iron", kg: 10 }]],
      [-0.5, [{ kind: "iron", kg: 20 }]],
    ] as const) {
      const horn = node(sled, x, 0.08, s * 0.335);
      horn.rotation.y = s > 0 ? 0 : Math.PI;
      mesh(cyl(0.045, 0.012, 20), m.frameDark, horn).rotation.x = Math.PI / 2;
      const tube = mesh(cyl(0.025, 0.26, 20), m.steel, horn);
      at(tube, 0, 0, 0.13, Math.PI / 2);
      const cap = mesh(cyl(0.03, 0.012, 20), m.uhmw, horn);
      at(cap, 0, 0, 0.265, Math.PI / 2);
      loadPlates(horn, 0.012, [...load]);
    }
  }
  for (const x of [-0.05, -0.5]) beam(sled, v3(x, 0.08, -0.31), v3(x, 0.08, 0.31), 0.05, 0.05, m.frame);
  block(sled, 0.045, 0.32, 0, 0.025, 0.62, 0.78, m.frame, 0.008);
  block(sled, 0.062, 0.34, 0, 0.012, 0.52, 0.7, m.rubber, 0.004);
  for (let i = 0; i < 9; i++) block(sled, 0.07, 0.12 + i * 0.055, 0, 0.006, 0.012, 0.66, m.grip, 0.002);
  block(sled, 0.075, 0.035, 0, 0.05, 0.03, 0.76, m.frame, 0.006);

  const sRest = 0.98;
  const pose = (s: number, release: number) => {
    sled.position.copy(L(s));
    for (const h of handles) h.rotation.z = 0.5 * release;
  };
  pose(sRest, 0);

  kit.spot("sled", v3(-0.5, 0.106, 0), sled);
  kit.spot("platform", v3(0.077, 0.45, 0.18), sled);
  kit.spot("seat", hip.clone().addScaledVector(seatDir, 0.2).addScaledVector(nSeat, 0.002));
  kit.spot("safety-handles", v3(-0.1, 0.22, 0.05), handles[0]);
  kit.spot("plate-horns", v3(-0.5, 0.08 + 0.028, 0.335 + 0.22), sled);

  const tick = new Ticker();
  let s = sRest;
  let release = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    release = damp(release, active ? 1 : 0, 4, dt);
    s = damp(s, active ? sRest - 0.44 * release * wave(time, 3.6) : sRest, 5, dt);
    pose(s, release);
  });
}

// ----------------------------------------------------------- leg extension

export function legExtension(): EquipmentModel {
  const kit = new Kit("leg-extension");
  const { m, root } = kit;
  const tower = stackTower(kit, -0.12, -0.66, 1.7, 14, 6);
  // Base frame.
  beam(root, v3(-0.45, 0.035, -0.02), v3(0.5, 0.035, -0.02), 0.1, 0.06, m.frame);
  beam(root, v3(0.42, 0.035, -0.3), v3(0.42, 0.035, 0.38), 0.08, 0.06, m.frame);
  beam(root, v3(-0.4, 0.035, -0.44), v3(-0.4, 0.035, 0.3), 0.08, 0.06, m.frame);
  for (const [x, z] of [[0.42, 0.34], [0.42, -0.26], [-0.4, 0.26]]) rubberFoot(root, x, z, 0.03, 0.005);

  // Seat and reclined backrest.
  beam(root, v3(0.03, 0.06, -0.02), v3(0.03, 0.43, -0.02), 0.08, 0.08, m.frame, Z);
  block(root, 0.03, 0.43, 0, 0.36, 0.014, 0.26, m.frameDark, 0.004);
  rectPad(node(root, 0.03, 0.436, 0), 0.44, 0.38, 0.068, 0.07);
  beam(root, v3(-0.4, 0.06, -0.02), v3(-0.36, 1.02, -0.02), 0.07, 0.07, m.frame, Z);
  const br = node(root, -0.335, 0.84, 0);
  br.rotation.z = -1.36;
  rectPad(br, 0.56, 0.38, 0.07, 0.08);
  for (const s of [1, -1]) {
    mesh(bentTube([v3(-0.06, 0.43, s * 0.14), v3(-0.02, 0.44, s * 0.24), v3(0.1, 0.46, s * 0.25)], 0.012, 0.04), m.frame, root);
    const grip = mesh(cyl(0.018, 0.12, 16), m.grip, root);
    at(grip, 0.14, 0.462, s * 0.25, 0, 0, -Math.PI / 2 + 0.17);
  }

  // Pivot housing on the user's right with the knee-alignment marker.
  const P = v3(0.32, 0.55, 0);
  const hz = 0.3;
  beam(root, v3(P.x, 0.06, hz), v3(P.x, P.y - 0.04, hz), 0.08, 0.08, m.frame, Z);
  beam(root, v3(0.42, 0.035, hz), v3(P.x, 0.035, hz), 0.08, 0.06, m.frame);
  const hub = mesh(cyl(0.075, 0.08, 32), m.frameDark, root);
  at(hub, P.x, P.y, hz, Math.PI / 2);
  const dial = mesh(cyl(0.065, 0.012, 32), m.steel, root);
  at(dial, P.x, P.y, hz + 0.046, Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hole = mesh(cyl(0.006, 0.004, 10), m.hole, root);
    at(hole, P.x + Math.cos(a) * 0.048, P.y + Math.sin(a) * 0.048, hz + 0.051, Math.PI / 2);
  }
  const dot = mesh(cyl(0.016, 0.006, 20), m.accent, root);
  at(dot, P.x, P.y, hz + 0.054, Math.PI / 2);

  // Lever arm with the shin roller; rotates about the pivot.
  const lever = kit.part(root, P.x, P.y, 0);
  const armZ = 0.235;
  beam(lever, v3(0, 0.03, armZ), v3(0, -0.47, armZ), 0.05, 0.035, m.frame, Z);
  beam(lever, v3(0, -0.2, armZ + 0.001), v3(0, -0.36, armZ + 0.001), 0.06, 0.045, m.frameDark, Z);
  at(knob(lever, 0.015), 0, -0.3, armZ + 0.023, Math.PI / 2);
  at(mesh(cyl(0.05, 0.03, 24), m.frameDark, lever), 0, 0, armZ, Math.PI / 2);
  const axle = mesh(cyl(0.014, 0.44, 14), m.steel, lever);
  at(axle, 0, -0.45, 0.02, Math.PI / 2);
  roller(node(lever, 0, -0.45, 0.01), 0.058, 0.38);
  const cam = mesh(cyl(0.07, 0.02, 32), m.aluminium, lever);
  at(cam, 0, 0, 0.2, Math.PI / 2);

  // Cable: cam → floor pulley → behind the stack → over the top → head plate.
  const tx = -0.12;
  const tz = -0.66;
  const r = 0.04;
  const p1 = v3(0.25, 0.08, 0.2);
  const p2 = v3(tx - 0.14, 0.08, tz);
  const p3 = v3(tx - 0.09, 1.5, tz);
  const heading = Math.atan2(p2.x - p1.x, p2.z - p1.z);
  for (const p of [p1, p2]) {
    const w = pulley(root, r);
    w.group.position.copy(p);
    w.group.rotation.y = heading + Math.PI / 2;
  }
  pulley(root, 0.09).group.position.copy(p3);
  const cables = [new Cable(root), new Cable(root), new Cable(root), new Cable(root)];
  cables[0].set(v3(p1.x, P.y, 0.2), v3(p1.x, p1.y + r, 0.2));
  cables[1].set(v3(p1.x, p1.y - r, p1.z), v3(p2.x, p2.y - r, p2.z));
  cables[2].set(v3(tx - 0.18, p2.y, tz), v3(tx - 0.18, p3.y, tz));

  const rest = 0.26;
  const pose = (angle: number) => {
    lever.rotation.z = angle;
    const lift = Math.max(0, (angle - rest) * 0.26);
    tower.lift(lift);
    cables[3].set(v3(tx, p3.y, tz), tower.head(lift));
  };
  pose(rest);

  kit.spot("seat", v3(0.12, 0.522, 0));
  kit.spot("shin-pad", v3(0.042, -0.45 + 0.042, 0.1), lever);
  kit.spot("pivot", v3(P.x, P.y, hz + 0.058));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));

  const tick = new Ticker();
  let angle = rest;
  return kit.finish((time, active) => {
    angle = damp(angle, active ? rest + 1.2 * wave(time, 3) : rest, 6, tick.dt(time));
    pose(angle);
  });
}
