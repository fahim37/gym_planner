import * as THREE from "three";
import { Kit, Ticker, at, beam, bentTube, block, cyl, damp, mesh, node, span, v3, wave } from "./helpers";
import type { EquipmentModel } from "./index";
import { spinner } from "./free-weights";
import { bolt, loadPlates, lockJaw, rubberFoot, shaft, sleeve, storageHorn } from "./parts";

// ---------------------------------------------------------------- trap bar

export function trapBar(): EquipmentModel {
  const kit = new Kit("trap-bar");
  const { m, root } = kit;
  const axis = 0.225;
  const bar = node(root, 0, axis, 0);
  // Hexagonal frame in the horizontal plane; the lifter stands inside it.
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return v3(Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36);
  });
  hex.forEach((p, i) => {
    const q = hex[(i + 1) % 6];
    span(mesh(cyl(0.016, p.distanceTo(q), 18), m.frameDark, bar), p, q);
    mesh(new THREE.SphereGeometry(0.016, 16, 10), m.frameDark, bar).position.copy(p);
  });
  // Raised, knurled neutral-grip handles on cross members.
  for (const s of [1, -1]) {
    const z = s * 0.25;
    span(mesh(cyl(0.016, 0.38, 18), m.frameDark, bar), v3(-0.19, 0, z), v3(0.19, 0, z));
    mesh(bentTube([v3(-0.17, 0, z), v3(-0.11, 0.1, z), v3(0.11, 0.1, z), v3(0.17, 0, z)], 0.015, 0.03), m.frameDark, bar);
    at(mesh(cyl(0.0165, 0.2, 18), m.knurl, bar), 0, 0.1, z, 0, 0, Math.PI / 2);
  }
  const spins = [1, -1].map((s) => {
    const side = node(bar);
    side.rotation.y = s > 0 ? 0 : Math.PI;
    const spin = kit.part(side);
    at(mesh(cyl(0.02, 0.06, 18), m.frameDark, spin), 0, 0, 0.37, Math.PI / 2);
    const inner = sleeve(spin, 0.39, 0.74);
    loadPlates(spin, inner + 0.002, [{ kind: "bumper", kg: 20 }], true);
    return spin;
  });
  kit.spot("frame", v3(0.312, axis + 0.017, 0));
  kit.spot("handles", v3(0, axis + 0.118, 0.25));
  kit.spot("sleeve", v3(0, axis + 0.026, 0.7));
  return kit.finish(spinner(spins, 1.4));
}

// ------------------------------------------------------------- plate tree

export function weightPlates(): EquipmentModel {
  const kit = new Kit("weight-plates");
  const { m, root } = kit;
  beam(root, v3(-0.36, 0.035, 0), v3(0.36, 0.035, 0), 0.08, 0.05, m.frameDark);
  beam(root, v3(0, 0.035, -0.32), v3(0, 0.035, 0.32), 0.08, 0.05, m.frameDark);
  for (const [x, z] of [[0.33, 0], [-0.33, 0], [0, 0.29], [0, -0.29]]) rubberFoot(root, x, z, 0.03, 0.01);
  beam(root, v3(0, 0.06, 0), v3(0, 1.15, 0), 0.08, 0.08, m.frame, v3(0, 0, 1), 0.006);
  block(root, 0, 1.16, 0, 0.1, 0.02, 0.1, m.uhmw, 0.006);
  bolt(root, v3(0.04, 1.1, 0), v3(1, 0, 0), 0.01);
  // Horns point front (+x) and back (−x): a parent turned so horn z runs along x.
  const turned = node(root);
  turned.rotation.y = Math.PI / 2;
  storageHorn(turned, 0, 0.28, 0.04, 1, [{ kind: "bumper", kg: 20 }, { kind: "bumper", kg: 20 }]);
  storageHorn(turned, 0, 0.86, 0.04, 1, [{ kind: "iron", kg: 5 }, { kind: "iron", kg: 2.5 }, { kind: "iron", kg: 1.25 }]);
  storageHorn(turned, 0, 0.28, -0.04, -1, [{ kind: "iron", kg: 20 }, { kind: "iron", kg: 20 }]);
  storageHorn(turned, 0, 0.86, -0.04, -1, [{ kind: "iron", kg: 10 }, { kind: "iron", kg: 10 }]);
  kit.spot("bumper", v3(0.08, 0.28 + 0.226, 0));
  kit.spot("iron", v3(0.063, 0.86 + 0.131, 0));
  kit.spot("tree", v3(0.041, 1.07, 0));
  return kit.finish();
}

// ---------------------------------------------------------------- landmine

export function landmine(): EquipmentModel {
  const kit = new Kit("landmine");
  const { m, root } = kit;
  const P = v3(-0.95, 0.12, 0);
  block(root, P.x, 0.006, 0, 0.42, 0.012, 0.42, m.frameDark, 0.004);
  for (const [dx, dz] of [[0.17, 0.17], [0.17, -0.17], [-0.17, 0.17], [-0.17, -0.17]]) bolt(root, v3(P.x + dx, 0.012, dz), v3(0, 1, 0), 0.012);
  mesh(cyl(0.05, 0.05, 24), m.frame, root).position.set(P.x, 0.037, 0);
  // Swivel: yaw about the post, pitch about the yoke pin.
  const yaw = kit.part(root, P.x, P.y, 0);
  for (const z of [-0.045, 0.045]) block(yaw, 0, -0.035, z, 0.07, 0.09, 0.012, m.frame, 0.004);
  at(mesh(cyl(0.012, 0.12, 12), m.steel, yaw), 0, 0, 0, Math.PI / 2);
  const pitch = kit.part(yaw);
  at(mesh(cyl(0.035, 0.3, 24), m.frame, pitch), 0.16, 0, 0, 0, 0, Math.PI / 2);
  at(mesh(cyl(0.04, 0.03, 24), m.frame, pitch), 0.3, 0, 0, 0, 0, Math.PI / 2);
  const bar = node(pitch, 1.15, 0, 0);
  bar.rotation.y = Math.PI / 2;
  shaft(bar);
  const near = node(bar);
  near.rotation.y = Math.PI;
  sleeve(near, 0.655, 1.1);
  const far = kit.part(bar);
  const inner = sleeve(far, 0.655, 1.1);
  const end = loadPlates(far, inner + 0.002, [{ kind: "bumper", kg: 20 }], false);
  lockJaw(far, end);
  // V-handle slid over the sleeve tip.
  at(mesh(cyl(0.034, 0.14, 20), m.frameDark, far), 0, 0, 1.03, Math.PI / 2);
  for (const s of [1, -1]) {
    const a = v3(0, 0.03, 1.02);
    const b = v3(s * 0.15, 0.14, 1.06);
    mesh(bentTube([a, v3(s * 0.05, 0.08, 1.04), b], 0.013, 0.03), m.frameDark, far);
    const grip = mesh(cyl(0.018, 0.12, 16), m.grip, far);
    span(grip, b, b.clone().add(v3(s * 0.08, 0.06, 0.01)));
  }
  const rest = Math.asin((0.225 - P.y) / 1.865);
  const pose = (p: number, y: number) => {
    pitch.rotation.z = p;
    yaw.rotation.y = y;
  };
  pose(rest, 0);
  kit.spot("pivot", v3(0.2, 0.036, 0), pitch);
  kit.spot("base", v3(P.x + 0.19, 0.013, 0.19));
  kit.spot("bar-end", v3(0, 0.226, 0.715), far);
  kit.spot("handle", v3(0.2, 0.2, 1.07), far);

  const tick = new Ticker();
  let p = rest;
  let y = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    const k = wave(time, 3.4);
    p = damp(p, active ? rest + (0.62 - rest) * k : rest, 5, dt);
    y = damp(y, active ? 0.3 * Math.sin((time / 6.8) * Math.PI * 2) * k : 0, 5, dt);
    pose(p, y);
  });
}
