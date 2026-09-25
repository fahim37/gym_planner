import * as THREE from "three";
import { Kit, at, beam, bentTube, block, cyl, decal, extrude, mesh, node, roundedRect, v3 } from "./helpers";
import type { EquipmentModel } from "./index";
import { textLabel } from "./materials";
import { knob, rectPad, roller, rubberFoot } from "./parts";

const Z = v3(0, 0, 1);

// -------------------------------------------------- dip & pull-up station

export function dipStation(): EquipmentModel {
  const kit = new Kit("dip-station");
  const { m, root } = kit;
  const ux = -0.35;
  const uz = 0.34;
  for (const s of [1, -1]) {
    const z = s * 0.42;
    beam(root, v3(-0.6, 0.035, z), v3(0.55, 0.035, z), 0.07, 0.06, m.frame);
    for (const x of [-0.55, 0.5]) rubberFoot(root, x, z, 0.03, 0.005);
    beam(root, v3(ux, 0.06, s * uz), v3(ux, 2.2, s * uz), 0.07, 0.07, m.frame, Z, 0.006);
    beam(root, v3(ux, 0.04, s * uz), v3(ux, 0.04, z), 0.07, 0.05, m.frame);
    beam(root, v3(0.45, 0.06, z), v3(ux + 0.03, 1.0, s * uz), 0.05, 0.05, m.frame);
    // Arm pads for knee raises, with vertical grips at their front ends.
    beam(root, v3(ux, 1.28, s * 0.29), v3(0.12, 1.28, s * 0.29), 0.05, 0.05, m.frame);
    rectPad(node(root, -0.1, 1.31, s * 0.29), 0.42, 0.11, 0.06, 0.03);
    beam(root, v3(0.12, 1.28, s * 0.29), v3(0.12, 1.1, s * 0.29), 0.035, 0.035, m.frame, Z);
    at(mesh(cyl(0.02, 0.13, 16), m.grip, root), 0.12, 1.17, s * 0.29);
    // Dip bars angle forward below the arm pads.
    beam(root, v3(ux, 1.1, s * uz), v3(-0.12, 1.1, s * 0.27), 0.05, 0.05, m.frame);
    mesh(bentTube([v3(-0.14, 1.1, s * 0.27), v3(0.48, 1.12, s * 0.24)], 0.018, 0), m.chrome, root);
    at(mesh(cyl(0.022, 0.26, 16), m.grip, root), 0.33, 1.115, s * 0.245, 0, 0, Math.PI / 2 - 0.03);
  }
  for (const y of [0.45, 1.5]) beam(root, v3(ux, y, -uz), v3(ux, y, uz), 0.06, 0.05, m.frame);
  block(root, ux + 0.04, 1.23, 0, 0.012, 0.55, 0.26, m.frameDark, 0.003);
  const back = node(root, ux + 0.047, 1.23, 0);
  back.rotation.z = -Math.PI / 2;
  rectPad(back, 0.52, 0.3, 0.07, 0.05);
  // Pull-up bar on brackets with angled, foam-gripped ends.
  const py = 2.14;
  for (const s of [1, -1]) beam(root, v3(ux, 2.17, s * uz), v3(-0.1, py, s * uz), 0.06, 0.05, m.frame);
  mesh(bentTube([v3(0.0, py - 0.1, -0.62), v3(-0.1, py, -0.44), v3(-0.1, py, 0.44), v3(0.0, py - 0.1, 0.62)], 0.016, 0.05), m.knurl, root);
  for (const s of [1, -1]) {
    const a = v3(-0.085, py - 0.015, s * 0.47);
    const b = v3(-0.01, py - 0.09, s * 0.6);
    const g = mesh(cyl(0.021, a.distanceTo(b), 16), m.grip, root);
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
  }
  kit.spot("dip-bars", v3(0.36, 1.137, 0.245));
  kit.spot("back-pad", v3(ux + 0.047 + 0.087, 1.28, 0));
  kit.spot("arm-pads", v3(0.0, 1.31 + 0.077, 0.29));
  kit.spot("pull-up-bar", v3(-0.1, py + 0.017, 0.15));
  return kit.finish();
}

// --------------------------------------------------------- preacher bench

export function preacherBench(): EquipmentModel {
  const kit = new Kit("preacher-bench");
  const { m, root } = kit;
  beam(root, v3(-0.45, 0.035, 0), v3(0.5, 0.035, 0), 0.08, 0.06, m.frame);
  for (const x of [-0.42, 0.46]) {
    beam(root, v3(x, 0.035, -0.3), v3(x, 0.035, 0.3), 0.07, 0.06, m.frame);
    for (const s of [1, -1]) rubberFoot(root, x, s * 0.26, 0.03, 0.005);
  }
  // Seat on an adjustable post.
  beam(root, v3(0.3, 0.06, 0), v3(0.3, 0.5, 0), 0.06, 0.06, m.frame, Z);
  beam(root, v3(0.3, 0.38, 0), v3(0.3, 0.55, 0), 0.075, 0.075, m.frameDark, Z);
  at(knob(root), 0.34, 0.42, 0, 0, 0, -Math.PI / 2);
  rectPad(node(root, 0.3, 0.555, 0), 0.32, 0.34, 0.07, 0.07);
  // Main post and the 45° arm pad.
  beam(root, v3(-0.2, 0.06, 0), v3(-0.14, 0.86, 0), 0.08, 0.08, m.frame, Z);
  const armPad = node(root, -0.09, 0.9, 0);
  armPad.rotation.z = Math.PI / 4;
  block(armPad, 0, -0.008, 0, 0.44, 0.016, 0.56, m.frameDark, 0.004);
  rectPad(armPad, 0.44, 0.58, 0.075, 0.08);
  // Bar rest cradles at the top edge, with a curl bar racked.
  const top = v3(-0.09 + Math.cos(Math.PI / 4) * 0.22, 0.9 + Math.sin(Math.PI / 4) * 0.22, 0);
  for (const s of [1, -1]) {
    const z = s * 0.34;
    beam(root, v3(-0.14, 0.8, 0), v3(top.x + 0.02, top.y + 0.05, z), 0.035, 0.035, m.frame);
    const cup = mesh(extrude(roundedRect(0.07, 0.05, 0.012), 0.03, 0.003, 4, 1), m.uhmw, root);
    at(cup, top.x + 0.05, top.y + 0.06, z);
  }
  const bar = node(root, top.x + 0.05, top.y + 0.1, 0);
  at(mesh(cyl(0.014, 1.2, 20), m.knurl, bar), 0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) {
    at(mesh(cyl(0.025, 0.2, 20), m.chrome, bar), 0, 0, s * 0.52, Math.PI / 2);
    at(mesh(cyl(0.04, 0.02, 20), m.chrome, bar), 0, 0, s * 0.41, Math.PI / 2);
  }
  kit.spot("arm-pad", v3(-0.09 - 0.064, 0.9 + 0.064, 0.12));
  kit.spot("seat", v3(0.3, 0.642, 0));
  kit.spot("bar-rest", v3(top.x + 0.05, top.y + 0.09, 0.34));
  return kit.finish();
}

// ------------------------------------------------- 45° back extension bench

export function hyperextensionBench(): EquipmentModel {
  const kit = new Kit("hyperextension-bench");
  const { m, root } = kit;
  const u = v3(Math.cos(0.75), Math.sin(0.75), 0);
  const n = v3(-u.y, u.x, 0);
  const B = v3(-0.55, 0.1, 0);
  for (const s of [1, -1]) {
    beam(root, v3(-0.7, 0.035, s * 0.3), v3(0.55, 0.035, s * 0.3), 0.07, 0.06, m.frame);
    for (const x of [-0.65, 0.5]) rubberFoot(root, x, s * 0.3, 0.03, 0.005);
  }
  for (const x of [-0.55, 0.4]) beam(root, v3(x, 0.05, -0.3), v3(x, 0.05, 0.3), 0.06, 0.05, m.frame);
  const T = B.clone().addScaledVector(u, 1.15);
  beam(root, B, T, 0.08, 0.08, m.frame, n);
  beam(root, v3(T.x - 0.05, 0.06, 0), T.clone().addScaledVector(u, -0.1), 0.08, 0.08, m.frame, Z);
  // Footplate across the lower end.
  const fp = node(root);
  fp.position.copy(B).addScaledVector(u, 0.12).addScaledVector(n, 0.06);
  fp.rotation.z = 0.75 - Math.PI / 2;
  block(fp, 0, 0, 0, 0.02, 0.26, 0.4, m.frameDark, 0.004);
  block(fp, 0.013, 0, 0, 0.006, 0.23, 0.36, m.grip, 0.003);
  // Ankle rollers on a short post.
  const ar = B.clone().addScaledVector(u, 0.32).addScaledVector(n, 0.2);
  beam(root, B.clone().addScaledVector(u, 0.3), ar, 0.05, 0.05, m.frame);
  for (const s of [1, -1]) roller(node(root, ar.x, ar.y, s * 0.1), 0.05, 0.17);
  at(mesh(cyl(0.012, 0.4, 12), m.steel, root), ar.x, ar.y, 0, Math.PI / 2);
  // Hip pads on an adjustable carriage, with side grips.
  const hp = T.clone().addScaledVector(u, -0.12).addScaledVector(n, 0.1);
  beam(root, T.clone().addScaledVector(u, -0.35).addScaledVector(n, 0.05), T.clone().addScaledVector(u, 0.02).addScaledVector(n, 0.05), 0.1, 0.03, m.frameDark, n);
  at(knob(root), T.x - 0.2, T.y - 0.12, 0.06, Math.PI / 2);
  for (const s of [1, -1]) {
    const pad = node(root, hp.x, hp.y, s * 0.12);
    pad.rotation.z = 0.75;
    rectPad(pad, 0.3, 0.2, 0.07, 0.05);
    mesh(bentTube([v3(T.x - 0.05, T.y - 0.05, s * 0.2), v3(T.x + 0.02, T.y + 0.08, s * 0.3), v3(T.x + 0.12, T.y + 0.1, s * 0.3)], 0.014, 0.04), m.frame, root);
    at(mesh(cyl(0.019, 0.1, 16), m.grip, root), T.x + 0.1, T.y + 0.1, s * 0.3, 0, 0, Math.PI / 2);
  }
  kit.spot("hip-pad", hp.clone().addScaledVector(n, 0.087).setZ(0.12));
  kit.spot("ankle-rollers", v3(ar.x, ar.y + 0.051, 0.1));
  kit.spot("footplate", fp.position.clone().addScaledVector(u, 0.017).add(v3(0, 0, 0.1)));
  return kit.finish();
}

// ----------------------------------------------------------------- plyo box

/** 3-in-1 plywood box (51 × 61 × 76 cm) standing at its 61 cm height. */
export function plyoBox(): EquipmentModel {
  const kit = new Kit("plyo-box");
  const { m, root } = kit;
  const W = 0.51;
  const H = 0.61;
  const L = 0.76;
  block(root, 0, H / 2, 0, W, H, L, m.wood, 0.012);
  block(root, 0, H + 0.002, 0, W - 0.07, 0.006, L - 0.07, m.rubber, 0.003);
  const hole = new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 0.9 });
  kit.own(hole);
  for (const s of [1, -1]) {
    const slot = mesh(extrude(roundedRect(0.16, 0.045, 0.022), 0.004, 0, 6), hole, root);
    at(slot, 0, H - 0.12, s * (L / 2 + 0.001));
  }
  const label = (text: string, w: number, h: number) => decal(root, textLabel(text, "#1c1917", 256, 128, "bold 90px sans-serif"), w, h);
  at(label("24″", 0.18, 0.09), W / 2 + 0.001, H * 0.45, 0, 0, Math.PI / 2, 0);
  at(label("30″", 0.16, 0.08), -0.13, H * 0.42, L / 2 + 0.002, 0, 0, Math.PI / 2);
  at(label("20″", 0.16, 0.08), 0.1, H * 0.42, L / 2 + 0.002);
  kit.spot("top", v3(0.05, H + 0.006, 0.1));
  kit.spot("sides", v3(W / 2 + 0.001, H * 0.3, 0.15));
  return kit.finish();
}
