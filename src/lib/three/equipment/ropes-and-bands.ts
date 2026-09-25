import * as THREE from "three";
import { DynamicTube, Kit, TAU, Ticker, at, block, cyl, damp, mesh, smooth, v3 } from "./helpers";
import type { EquipmentModel } from "./index";
import { bolt } from "./parts";

const X = v3(1, 0, 0);

// ------------------------------------------------------------ battle ropes

/**
 * A 9 m rope doubled around a floor anchor: two 4.4 m strands whose free
 * ends carry heat-shrink grips. Active: alternating waves.
 */
export function battleRopes(): EquipmentModel {
  const kit = new Kit("battle-ropes");
  const { m, root } = kit;
  const r = 0.019;
  const xa = -2.05;
  const xg = 2.25;
  const len = xg - xa;
  const half = 150;
  const turn = 16;
  const N = half * 2 + turn;
  const rope = new DynamicTube(root, m.rope, N, 12, r, r, false, 2 * len + 0.2);

  // Anchor: bolted floor plate with an eye the rope wraps behind.
  block(root, xa + 0.02, 0.006, 0, 0.2, 0.012, 0.2, m.frameDark, 0.004);
  for (const [dx, dz] of [[0.07, 0.07], [0.07, -0.07], [-0.03, 0.07], [-0.03, -0.07]]) bolt(root, v3(xa + 0.02 + dx, 0.012, dz), v3(0, 1, 0), 0.01);
  const eye = mesh(new THREE.TorusGeometry(0.055, 0.013, 12, 24, Math.PI), m.steel, root);
  at(eye, xa + 0.04, 0.012, 0, 0, Math.PI / 2, 0);
  for (const s of [1, -1]) at(mesh(cyl(0.022, 0.02, 16), m.steel, root), xa + 0.04, 0.02, s * 0.055, 0, 0, 0);

  const grips = [1, -1].map((s) => {
    const g = kit.part(root);
    at(mesh(cyl(0.025, 0.3, 18), m.tape, g), 0.15, 0, 0, 0, 0, Math.PI / 2);
    at(mesh(cyl(0.027, 0.03, 18), m.accent, g), 0.015, 0, 0, 0, 0, Math.PI / 2);
    at(mesh(cyl(0.026, 0.012, 18), m.tape, g), 0.3, 0, 0, 0, 0, Math.PI / 2);
    g.userData.side = s;
    return g;
  });
  const marker = kit.part(root);

  const pts = Array.from({ length: N }, () => new THREE.Vector3());
  const strand = (s: number, u: number, amp: number, time: number, out: THREE.Vector3) => {
    // u: 0 at the anchor → 1 at the grip.
    const lift = amp * 0.85 * smooth((u - 0.72) / 0.28);
    const wave = amp * 0.24 * u * Math.sin(((1 - u) * len * TAU) / 1.7 - time * TAU * 1.8 + (s > 0 ? 0 : Math.PI));
    return out.set(xa + u * len * (1 - 0.05 * amp), r + Math.max(0, lift + wave * (1 - 0.6 * smooth((u - 0.8) / 0.2))), s * (0.06 + 0.3 * u * u));
  };
  const pose = (amp: number, time: number) => {
    for (let i = 0; i < half; i++) strand(1, 1 - i / (half - 1), amp, time, pts[i]);
    for (let i = 0; i < turn; i++) {
      const a = ((i + 1) / (turn + 1)) * Math.PI;
      pts[half + i].set(xa - 0.015 * Math.sin(a), r, 0.06 * Math.cos(a));
    }
    for (let i = 0; i < half; i++) strand(-1, i / (half - 1), amp, time, pts[half + turn + i]);
    rope.set(pts);
    for (const g of grips) {
      const s = g.userData.side as number;
      const end = s > 0 ? pts[0] : pts[N - 1];
      const inner = s > 0 ? pts[10] : pts[N - 11];
      g.position.copy(end).addScaledVector(inner.clone().sub(end).normalize(), 0.3);
      g.quaternion.setFromUnitVectors(X, end.clone().sub(inner).normalize());
      g.position.y = Math.max(g.position.y, 0.026);
    }
    marker.position.copy(pts[Math.round(half * 0.45)]).add(v3(0, r, 0));
  };
  pose(0, 0);
  kit.spot("rope", v3(), marker);
  kit.spot("anchor", v3(xa + 0.04, 0.012 + 0.068, 0));
  kit.spot("grips", v3(0.15, 0.026, 0), grips[0]);

  const tick = new Ticker();
  let amp = 0;
  let clock = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    amp = damp(amp, active ? 1 : 0, 2.5, dt);
    clock += dt;
    if (amp > 1e-4 || active) pose(amp, clock);
    else pose(0, 0);
  });
}

// --------------------------------------------------------- resistance bands

/**
 * A tube band threaded through a door anchor, with foam handles, and a flat
 * loop band beside it. Active: the handles are pulled up and apart and the
 * tube thins as it stretches; the loop band is pulled long.
 */
export function resistanceBands(): EquipmentModel {
  const kit = new Kit("resistance-bands");
  const { m, root } = kit;
  const A = v3(-0.42, 0.014, 0);

  // Door anchor: flat strap loop with a foam bolster at the far end.
  const strapN = 40;
  const strap = new DynamicTube(root, m.nylon, strapN, 8, 0.013, 0.0018, true, 0.5);
  strap.set(Array.from({ length: strapN }, (_, i) => {
    const a = (i / strapN) * TAU;
    return v3(A.x - 0.1 + Math.cos(a) * 0.11, 0.004, Math.sin(a) * 0.022);
  }));
  at(mesh(cyl(0.022, 0.1, 20), m.grip, root), A.x - 0.21, 0.022, 0, Math.PI / 2);
  at(mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 20), m.steel, root), A.x + 0.005, 0.01, 0, Math.PI / 2);

  // Tube band with two handles.
  const N = 121;
  const tube = new DynamicTube(root, m.bandGreen, N, 10, 0.0065, 0.0065, false, 1.3);
  const handles = [1, -1].map((s) => {
    const h = kit.part(root);
    mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 16), m.steel, h);
    const strapTri = [v3(0, 0, 0), v3(0.1, 0, 0.07), v3(0.1, 0, -0.07)];
    for (let i = 0; i < 3; i++) {
      const a = strapTri[i];
      const b = strapTri[(i + 1) % 3];
      const bar = mesh(cyl(0.004, a.distanceTo(b), 6), m.nylon, h);
      bar.position.copy(a).add(b).multiplyScalar(0.5);
      bar.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
    }
    at(mesh(cyl(0.02, 0.13, 18), m.grip, h), 0.105, 0, 0, Math.PI / 2);
    h.userData.side = s;
    return h;
  });

  // Loop band: a long flat power band lying beside them.
  const loopN = 80;
  const loop = new DynamicTube(root, m.bandRed, loopN, 8, 0.022, 0.0022, true, 2.1);
  const loopPts = Array.from({ length: loopN }, () => new THREE.Vector3());
  const loopMarker = kit.part(root);
  const tubeMarker = kit.part(root);

  const pts = Array.from({ length: N }, () => new THREE.Vector3());
  const c = new THREE.Vector3();
  const pose = (k: number) => {
    const ends = [1, -1].map((s) => v3(0.42 - 0.12 * k, 0.022 + 0.9 * k, s * (0.3 + 0.12 * k)));
    const midN = (N - 1) / 2;
    let length = 0;
    for (let i = 0; i < N; i++) {
      const side = i < midN ? 1 : -1;
      const t = side > 0 ? 1 - i / midN : (i - midN) / midN;
      const end = ends[side > 0 ? 0 : 1];
      c.set(0.05 - 0.1 * k, 0.012 + 0.25 * k, side * 0.02);
      // Quadratic curve anchor → control → handle.
      const a = A;
      const p = pts[i];
      p.set(
        (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * end.x,
        (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * end.y,
        (1 - t) * (1 - t) * a.z + 2 * (1 - t) * t * c.z + t * t * end.z,
      );
      p.y = Math.max(p.y, 0.0065);
      if (i > 0) length += p.distanceTo(pts[i - 1]);
    }
    tube.set(pts, 0.0065 * Math.sqrt(1.9 / Math.max(1.9, length)), 0.0065 * Math.sqrt(1.9 / Math.max(1.9, length)));
    for (const h of handles) {
      const s = h.userData.side as number;
      const end = s > 0 ? pts[0] : pts[N - 1];
      const prev = s > 0 ? pts[3] : pts[N - 4];
      h.position.copy(end);
      h.quaternion.setFromUnitVectors(X, end.clone().sub(prev).normalize());
    }
    tubeMarker.position.copy(pts[Math.round(midN * 0.5)]);
    const ax = 0.5 + 0.14 * k;
    const az = 0.11 - 0.05 * k;
    for (let i = 0; i < loopN; i++) {
      const a = (i / loopN) * TAU;
      loopPts[i].set(0.05 + Math.cos(a) * ax, 0.0025, -0.72 + Math.sin(a) * az);
    }
    loop.set(loopPts);
    loopMarker.position.set(0.05, 0.005, -0.72 + az);
  };
  pose(0);
  kit.spot("loop", v3(), loopMarker);
  kit.spot("tube", v3(0, 0.007, 0), tubeMarker);
  kit.spot("handles", v3(0.105, 0.021, 0), handles[0]);
  kit.spot("anchor", v3(A.x - 0.21, 0.045, 0.02));

  const tick = new Ticker();
  let k = 0;
  return kit.finish((time, active) => {
    const next = damp(k, active ? 0.5 - 0.5 * Math.cos((time / 2.8) * TAU) : 0, 5, tick.dt(time));
    if (Math.abs(next - k) > 1e-6) {
      k = next;
      pose(k);
    }
  });
}
