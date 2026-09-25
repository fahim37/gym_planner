import * as THREE from "three";
import {
  Kit,
  Ticker,
  at,
  beam,
  block,
  cyl,
  damp,
  decal,
  extrude,
  lathe,
  mesh,
  node,
  roundedPolygon,
  settleAngle,
  v3,
  type ProfilePoint,
} from "./helpers";
import type { EquipmentModel } from "./index";
import { mats, textLabel } from "./materials";
import { loadPlates, olympicBar, rubberFoot, sleeve } from "./parts";

/** Sleeves spin while active and settle back to their rest orientation. */
function spinner(groups: THREE.Group[], speed: number) {
  const tick = new Ticker();
  let angle = 0;
  let omega = 0;
  return (time: number, active: boolean) => {
    const dt = tick.dt(time);
    omega = damp(omega, active ? speed : 0, 2.5, dt);
    angle += omega * dt;
    if (!active) angle = settleAngle(angle, 1.5, dt);
    for (const g of groups) g.rotation.z = angle;
  };
}

export function barbell(): EquipmentModel {
  const kit = new Kit("barbell");
  const bar = olympicBar(kit.root, [{ kind: "bumper", kg: 20 }, { kind: "bumper", kg: 10 }], true);
  const axis = 0.225;
  bar.group.position.y = axis;
  kit.spot("shaft", v3(0, axis + 0.015, 0.3));
  kit.spot("sleeve", v3(0, axis + 0.026, 0.96));
  kit.spot("plate", v3(0, 2 * axis, 0.715));
  kit.spot("collar", v3(0.032, axis - 0.031, 0.807));
  return kit.finish(spinner(bar.spins, 1.4));
}

// ------------------------------------------------------------- dumbbells

/** Rubber hex dumbbell, handle along local x, centred on the handle. */
function dumbbell(parent: THREE.Object3D, kg: number) {
  const m = mats();
  const g = node(parent);
  const R = 0.042 + 0.0019 * kg;
  const L = 0.03 + 0.0036 * kg;
  const handle = mesh(cyl(0.016, 0.15, 18), m.knurl, g);
  handle.rotation.z = Math.PI / 2;
  const bevel = 0.005;
  const hex = roundedPolygon(
    Array.from({ length: 6 }, (_, i): [number, number] => [Math.cos((i * Math.PI) / 3) * (R - bevel), Math.sin((i * Math.PI) / 3) * (R - bevel)]),
    0.008,
  );
  const headGeo = extrude(hex, L - 2 * bevel, bevel, 4, 2);
  const label = textLabel(`${kg}`, "#e4e4e7", 128, 64, "bold 44px sans-serif");
  for (const s of [1, -1]) {
    const collar = mesh(cyl(0.026, 0.008, 20), m.chrome, g);
    at(collar, s * 0.07, 0, 0, 0, 0, Math.PI / 2);
    const head = mesh(headGeo, m.rubber, g);
    at(head, s * (0.074 + L / 2), 0, 0, 0, Math.PI / 2, 0);
    const cap = mesh(cyl(R * 0.42, 0.004, 24), m.chrome, g);
    at(cap, s * (0.074 + L + 0.001), 0, 0, 0, 0, Math.PI / 2);
    // Weight printed on the top face of each head.
    const d = decal(g, label, 0.05, 0.025);
    at(d, s * (0.074 + L / 2), R * 0.866 + 0.0008, 0, -Math.PI / 2, 0, Math.PI / 2);
  }
  return { group: g, R, kg };
}

export function dumbbells(): EquipmentModel {
  const kit = new Kit("dumbbells");
  const { m, root } = kit;
  const halfLen = 0.8;
  const tiers = [
    { x: -0.13, y: 0.8, kgs: [2.5, 5, 7.5, 10] },
    { x: 0.13, y: 0.46, kgs: [12.5, 15, 17.5, 20] },
  ];
  const tilt = -0.2;
  const racked: ReturnType<typeof dumbbell>[] = [];
  const tierGroups: THREE.Group[] = [];
  for (const t of tiers) {
    const tier = node(root, t.x, t.y, 0);
    tier.rotation.z = tilt;
    tierGroups.push(tier);
    for (const x of [-0.1, 0.1]) {
      beam(tier, v3(x, 0, -halfLen), v3(x, 0, halfLen), 0.05, 0.035, m.frame);
      beam(tier, v3(x, 0.019, -halfLen + 0.02), v3(x, 0.019, halfLen - 0.02), 0.034, 0.006, m.uhmw, undefined, 0.002);
    }
    for (const s of [1, -1]) beam(tier, v3(-0.15, -0.03, s * (halfLen + 0.03)), v3(0.15, -0.03, s * (halfLen + 0.03)), 0.06, 0.05, m.frame);
    // Pairs from light (−z) to heavy (+z), resting on both rails.
    const widths = t.kgs.map((kg) => 2 * (0.042 + 0.0019 * kg));
    const total = widths.reduce((a, w) => a + 2 * w, 0) + 0.022 * 4 + 0.06 * 3;
    let z = -total / 2;
    t.kgs.forEach((kg, pi) => {
      for (let k = 0; k < 2; k++) {
        const w = widths[pi];
        const db = dumbbell(tier, kg);
        db.group.position.set(0, 0.022 + db.R * 0.866, z + w / 2);
        racked.push(db);
        z += w + (k === 0 ? 0.022 : 0.06);
      }
    });
  }
  // End frames: foot, post, and a low back brace.
  for (const s of [1, -1]) {
    const z = s * (halfLen + 0.03);
    beam(root, v3(-0.36, 0.045, z), v3(0.36, 0.045, z), 0.07, 0.06, m.frame);
    beam(root, v3(0, 0.07, z), v3(0, 0.84, z), 0.08, 0.05, m.frame, v3(0, 0, 1));
    for (const x of [-0.32, 0.32]) rubberFoot(root, x, z, 0.03, 0.016);
    for (const x of [-0.366, 0.366]) block(root, x, 0.045, z, 0.012, 0.064, 0.074, m.uhmw, 0.004);
  }
  beam(root, v3(-0.02, 0.16, -halfLen - 0.01), v3(-0.02, 0.16, halfLen + 0.01), 0.05, 0.04, m.frame);

  // The second 17.5 kg dumbbell, front and centre on the lower tier.
  const featured = racked.filter((d) => d.kg === 17.5)[1];
  const fg = featured.group;
  kit.spot("handle", v3(0, 0.017, 0), fg);
  kit.spot("head", v3(0.12, featured.R * 0.86, 0), fg);
  kit.spot("rack", v3(0.1, 0.023, halfLen - 0.03), tierGroups[1]);

  // "In use": the featured dumbbell lifts out of the rack and turns slowly.
  const rest = fg.position.clone();
  const q = new THREE.Quaternion();
  const Y = v3(0, 1, 0);
  const Z = v3(0, 0, 1);
  const tick = new Ticker();
  let lift = 0;
  let spin = 0;
  const update = (time: number, active: boolean) => {
    const dt = tick.dt(time);
    lift = damp(lift, active ? 1 : 0, 2.2, dt);
    spin = active ? spin + dt * 0.9 * lift : settleAngle(spin, 2.5, dt);
    const up = new THREE.Vector3(0.2, 0.3, 0).applyAxisAngle(v3(0, 0, 1), -tilt).multiplyScalar(lift);
    fg.position.copy(rest).add(up);
    fg.quaternion.setFromAxisAngle(Z, -tilt * lift).multiply(q.setFromAxisAngle(Y, spin));
  };
  return kit.finish(update);
}

// ------------------------------------------------------------ kettlebell

export function kettlebell(): EquipmentModel {
  const kit = new Kit("kettlebell");
  const { m, root } = kit;
  const body = node(root);
  const R = 0.108;
  const cy = R - 0.012;
  const prof: ProfilePoint[] = [[0, 0], [0.044, 0], [0.049, 0.002]];
  const a0 = Math.asin(-cy / R);
  const a1 = (68 * Math.PI) / 180;
  for (let i = 0; i <= 16; i++) {
    const a = a0 + ((a1 - a0) * i) / 16;
    prof.push([Math.cos(a) * R, cy + Math.sin(a) * R, true]);
  }
  prof.push([0.028, cy + R * 0.985, true], [0, cy + R * 1.0]);
  mesh(lathe(prof, 48), m.iron, body);

  // Handle: horns rise from the shoulders and join over the top along z.
  const top = 0.292;
  const pts = [
    v3(0, 0.15, -0.066),
    v3(0, 0.215, -0.08),
    v3(0, 0.262, -0.074),
    v3(0, top - 0.004, -0.044),
    v3(0, top, 0),
    v3(0, top - 0.004, 0.044),
    v3(0, 0.262, 0.074),
    v3(0, 0.215, 0.08),
    v3(0, 0.15, 0.066),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  mesh(new THREE.TubeGeometry(curve, 64, 0.0175, 16, false), m.iron, body);
  for (const s of [1, -1]) {
    const flare = mesh(new THREE.SphereGeometry(0.026, 20, 12), m.iron, body);
    flare.scale.set(1, 0.75, 1);
    flare.position.set(0, 0.18, s * 0.068);
  }
  // Painted weight on the front of the bell.
  const label = textLabel("16", "#fbbf24", 256, 128, "bold 96px sans-serif");
  const patch = new THREE.SphereGeometry(R + 0.0008, 24, 12, -0.45, 0.9, Math.PI / 2 - 0.2, 0.4);
  const d = mesh(patch, decalMat(label), body);
  d.castShadow = false;
  d.position.y = cy;
  d.rotation.y = Math.PI;
  const kgLabel = textLabel("KG", "#fbbf24", 256, 128, "bold 72px sans-serif");
  const patch2 = new THREE.SphereGeometry(R + 0.0008, 16, 8, -0.3, 0.6, Math.PI / 2 + 0.2, 0.24);
  const d2 = mesh(patch2, decalMat(kgLabel), body);
  d2.castShadow = false;
  d2.position.y = cy;
  d2.rotation.y = Math.PI;

  kit.spot("handle", v3(0, top + 0.018, 0), body);
  kit.spot("horns", v3(0, 0.235, 0.098), body);
  kit.spot("bell", v3(R * 0.94, cy - 0.03, 0), body);

  const tick = new Ticker();
  let lift = 0;
  let spin = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    lift = damp(lift, active ? 1 : 0, 2, dt);
    spin = active ? spin + dt * 0.8 : settleAngle(spin, 2, dt);
    body.position.y = lift * (0.07 + 0.015 * Math.sin(time * 2.1));
    body.rotation.y = spin;
  });
}

const decalMats = new Map<string, THREE.MeshStandardMaterial>();
function decalMat(tex: THREE.Texture) {
  let mat = decalMats.get(tex.uuid);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    decalMats.set(tex.uuid, mat);
  }
  return mat;
}

// ------------------------------------------------------------ EZ curl bar

export function ezCurlBar(): EquipmentModel {
  const kit = new Kit("ez-curl-bar");
  const { m, root } = kit;
  const axis = 0.165;
  const bar = kit.part(root, 0, axis, 0);
  // Tilt the camber plane so the W reads from the front as well as from above.
  bar.rotation.z = 0.6;
  // W-shaped cambered middle in the horizontal plane; knurled angled grips.
  const half: [number, number][] = [
    [0, 0],
    [0.075, 0],
    [0.165, 0.055],
    [0.255, 0],
    [0.4, 0],
  ];
  const r = 0.014;
  for (const s of [1, -1]) {
    for (let i = 0; i < half.length - 1; i++) {
      const a = v3(half[i][1], 0, s * half[i][0]);
      const b = v3(half[i + 1][1], 0, s * half[i + 1][0]);
      const seg = mesh(cyl(r, a.distanceTo(b), 20), i === 1 || i === 2 ? m.knurl : m.chrome, bar);
      seg.position.copy(a).add(b).multiplyScalar(0.5);
      seg.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
      if (i > 0) mesh(new THREE.SphereGeometry(r, 16, 10), m.chrome, bar).position.copy(a);
    }
  }
  const spins = [1, -1].map((s) => {
    const side = node(bar);
    side.rotation.y = s > 0 ? 0 : Math.PI;
    const spin = kit.part(side);
    const inner = sleeve(spin, 0.39, 0.6);
    loadPlates(spin, inner + 0.002, [{ kind: "iron", kg: 10 }, { kind: "iron", kg: 5 }], true);
    return spin;
  });
  kit.spot("camber", v3(0.0275, r + 0.001, 0.21), bar);
  kit.spot("sleeve", v3(0, axis + 0.026, 0.57));
  kit.spot("plate", v3(0, 2 * axis, 0.435));
  return kit.finish(spinner(spins, 1.4));
}

