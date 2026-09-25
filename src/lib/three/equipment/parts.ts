import * as THREE from "three";
import {
  TAU,
  at,
  bentTube,
  block,
  boxTube,
  circlePath,
  cyl,
  decal,
  extrude,
  lathe,
  mesh,
  node,
  roundedPolygon,
  shared,
  span,
  v3,
  type ProfilePoint,
} from "./helpers";
import { mats, plateDecal, stackLabels, textLabel } from "./materials";

/**
 * Reusable assemblies shared by several models. Unless noted, each builds in
 * its own local frame and is added to `parent`.
 */

// ------------------------------------------------------------ upholstery

/**
 * Upholstered pad: a bevelled cushion with a piped top edge on a black board.
 * `corners` outline the pad in local x/z; its underside sits at y = 0.
 */
export function pad(parent: THREE.Object3D, corners: [number, number][], thickness: number, radius = 0.035) {
  const m = mats();
  const g = node(parent);
  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const w = Math.max(...xs) - Math.min(...xs);
  const d = Math.max(...zs) - Math.min(...zs);
  const bevel = Math.min(0.018, thickness * 0.3);
  const board = 0.016;
  const inset = (k: number) => corners.map(([x, z]): [number, number] => [cx + (x - cx) * (1 - k / w), -(cz + (z - cz) * (1 - k / d))]);

  const baseShape = roundedPolygon(inset(0.012), radius);
  const base = mesh(extrude(baseShape, board, 0, 6), m.board, g);
  base.rotation.x = -Math.PI / 2;
  base.position.y = board / 2;

  const cushion = mesh(extrude(roundedPolygon(inset(bevel * 2), Math.max(0.005, radius - bevel)), thickness - 2 * bevel, bevel, 8, 4), m.pad, g);
  cushion.rotation.x = -Math.PI / 2;
  cushion.position.y = board + thickness / 2;

  // Piping where the top panel meets the side boxing.
  const outline = roundedPolygon(inset(0), radius).getPoints(8);
  const y = board + thickness - bevel * 0.9;
  const curve = new THREE.CatmullRomCurve3(outline.map((p) => v3(p.x, y, -p.y)), true, "centripetal");
  mesh(new THREE.TubeGeometry(curve, outline.length * 2, 0.0035, 6, true), m.welt, g);
  return g;
}

/** Rectangular pad helper: `len` along x, `width` along z. */
export function rectPad(parent: THREE.Object3D, len: number, width: number, thickness: number, radius = 0.04) {
  return pad(parent, [[-len / 2, -width / 2], [len / 2, -width / 2], [len / 2, width / 2], [-len / 2, width / 2]], thickness, radius);
}

/** Cylindrical foam roller along local z, with steel end discs. */
export function roller(parent: THREE.Object3D, r: number, len: number) {
  const m = mats();
  const g = node(parent);
  const prof: ProfilePoint[] = [
    [0.012, -len / 2],
    [r - 0.012, -len / 2],
    [r - 0.004, -len / 2 + 0.004, true],
    [r, -len / 2 + 0.014, true],
    [r, len / 2 - 0.014, true],
    [r - 0.004, len / 2 - 0.004, true],
    [r - 0.012, len / 2],
    [0.012, len / 2],
  ];
  const foam = mesh(lathe(prof, 32), m.pad, g);
  foam.rotation.x = Math.PI / 2;
  for (const s of [1, -1]) {
    const cap = mesh(cyl(0.024, 0.01, 18), m.chrome, g);
    at(cap, 0, 0, s * (len / 2 + 0.004), Math.PI / 2);
  }
  return g;
}

// ------------------------------------------------------------- hardware

export function rubberFoot(parent: THREE.Object3D, x: number, z: number, r = 0.026, h = 0.014) {
  const f = mesh(cyl(r, h, 16, r * 0.85), mats().rubber, parent);
  f.position.set(x, h / 2, z);
  return f;
}

/** Hex bolt head whose axis points along `dir`. */
export function bolt(parent: THREE.Object3D, p: THREE.Vector3, dir: THREE.Vector3, r = 0.009) {
  const b = mesh(cyl(r, 0.007, 6), mats().steel, parent);
  span(b, p, p.clone().addScaledVector(dir.clone().normalize(), 0.007));
  return b;
}

/** Pop-pin knob pointing along local +y from the origin. */
export function knob(parent: THREE.Object3D, r = 0.018) {
  const m = mats();
  const g = node(parent);
  mesh(cyl(0.006, 0.03, 10), m.chrome, g).position.y = 0.012;
  const k = mesh(
    lathe(
      [
        [0, 0.02],
        [r * 0.7, 0.02],
        [r, 0.026, true],
        [r, 0.042, true],
        [r * 0.75, 0.05, true],
        [0, 0.052],
      ],
      20,
    ),
    m.accent,
    g,
  );
  k.castShadow = false;
  return g;
}

/** Transport wheel, axle along local z. */
export function wheel(parent: THREE.Object3D, r: number, w: number) {
  const m = mats();
  const g = node(parent);
  const tire = mesh(
    lathe(
      [
        [r * 0.55, -w / 2],
        [r - w * 0.3, -w / 2],
        [r, -w * 0.15, true],
        [r, w * 0.15, true],
        [r - w * 0.3, w / 2],
        [r * 0.55, w / 2],
      ],
      28,
    ),
    m.rubber,
    g,
  );
  tire.rotation.x = Math.PI / 2;
  const hub = mesh(cyl(r * 0.58, w * 0.8, 20), m.plasticLight, g);
  hub.rotation.x = Math.PI / 2;
  const cap = mesh(cyl(r * 0.2, w + 0.006, 12), m.steel, g);
  cap.rotation.x = Math.PI / 2;
  return g;
}

// ----------------------------------------------------------------- plates

export type PlateSpec = { kind: "bumper" | "iron"; kg: number };

const BUMPER: Record<number, [number, string]> = {
  25: [0.07, "#dc2626"],
  20: [0.06, "#2563eb"],
  15: [0.05, "#eab308"],
  10: [0.04, "#16a34a"],
};
const IRON: Record<number, [number, number]> = {
  25: [0.225, 0.045],
  20: [0.225, 0.038],
  15: [0.2, 0.034],
  10: [0.165, 0.03],
  5: [0.13, 0.026],
  2.5: [0.105, 0.021],
  1.25: [0.08, 0.018],
};

export function plateSize(spec: PlateSpec): { r: number; t: number } {
  if (spec.kind === "bumper") return { r: 0.225, t: BUMPER[spec.kg][0] };
  const [r, t] = IRON[spec.kg];
  return { r, t };
}

/** A weight plate centred on the origin with its bore along local z. */
export function plate(parent: THREE.Object3D, spec: PlateSpec) {
  const m = mats();
  const g = node(parent);
  const { r, t } = plateSize(spec);
  const h = t / 2;
  const key = `${spec.kind}-${spec.kg}`;
  // Turned parts are lathed around y, then laid so the bore runs along z.
  const turned = (name: string, mat: THREE.Material, seg: number, profile: () => ProfilePoint[]) => {
    mesh(shared(`${key}-${name}`, () => lathe(profile(), seg)), mat, g).rotation.x = Math.PI / 2;
  };
  if (spec.kind === "bumper") {
    const e = 0.011;
    const q = e * (1 - Math.SQRT1_2);
    turned("body", m.rubber, 48, () => [
      [0.064, -h + 0.006],
      [0.186, -h + 0.006],
      [0.196, -h],
      [r - e, -h],
      [r - q, -h + q, true],
      [r, -h + e],
      [r, h - e],
      [r - q, h - q, true],
      [r - e, h],
      [0.196, h],
      [0.186, h - 0.006],
      [0.064, h - 0.006],
      [0.064, -h + 0.006],
    ]);
    turned("hub", m.steel, 32, () => [
      [0.0255, -h + 0.002],
      [0.066, -h + 0.002],
      [0.066, h - 0.002],
      [0.0255, h - 0.002],
      [0.0255, -h + 0.002],
    ]);
    const ring = shared("bumper-decal", () => new THREE.RingGeometry(0.068, 0.19, 48, 1));
    const mat = decalMaterial(plateDecal(spec.kg, BUMPER[spec.kg][1]));
    for (const s of [1, -1]) {
      const d = mesh(ring, mat, g);
      d.castShadow = false;
      at(d, 0, 0, s * (h - 0.0055), 0, s > 0 ? 0 : Math.PI, 0);
    }
    return g;
  }
  // Tri-grip iron plate: extruded disc with a bore and three hand slots,
  // a raised rim and a steel hub insert.
  const bevel = Math.min(0.004, t * 0.2);
  const body = shared(`${key}-body`, () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r - bevel, 0, TAU, false);
    shape.holes.push(circlePath(0.026 + bevel));
    if (r >= 0.13) {
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + (k * TAU) / 3;
        shape.holes.push(slot(0.64 * r, a, 0.36 * r, 0.14 * r + 2 * bevel));
      }
    }
    return extrude(shape, t - 2 * bevel - 0.004, bevel, 48, 2);
  });
  mesh(body, m.iron, g);
  turned("rim", m.iron, 48, () => [
    [r * 0.86, -h + 0.003],
    [r - 0.004, -h],
    [r, -h + 0.004, true],
    [r, h - 0.004, true],
    [r - 0.004, h],
    [r * 0.86, h - 0.003],
  ]);
  turned("hub", m.steel, 28, () => [
    [0.0255, -h],
    [0.05, -h],
    [0.056, -h + 0.006],
    [0.056, h - 0.006],
    [0.05, h],
    [0.0255, h],
    [0.0255, -h],
  ]);
  if (r >= 0.13) {
    const label = textLabel(`${spec.kg} KG`, "#e4e4e7", 256, 96, "bold 64px sans-serif");
    for (const s of [1, -1]) {
      const d = decal(g, label, r * 0.42, r * 0.16);
      at(d, 0, -0.63 * r, s * (h - 0.0015), 0, s > 0 ? 0 : Math.PI, 0);
    }
  }
  return g;
}

function slot(radius: number, angle: number, len: number, width: number) {
  const c = new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  const tan = angle + Math.PI / 2;
  const t = new THREE.Vector2(Math.cos(tan), Math.sin(tan)).multiplyScalar(len / 2 - width / 2);
  const pts: THREE.Vector2[] = [];
  for (const [end, from] of [[c.clone().add(t), tan - Math.PI / 2], [c.clone().sub(t), tan + Math.PI / 2]] as const) {
    for (let i = 0; i <= 8; i++) {
      const a = from + (i / 8) * Math.PI;
      pts.push(new THREE.Vector2(end.x + Math.cos(a) * (width / 2), end.y + Math.sin(a) * (width / 2)));
    }
  }
  return new THREE.Path(pts);
}

const ringDecals = new Map<string, THREE.MeshStandardMaterial>();
function decalMaterial(tex: THREE.Texture) {
  let mat = ringDecals.get(tex.uuid);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    ringDecals.set(tex.uuid, mat);
  }
  return mat;
}

/**
 * Loads plates onto a sleeve running along local +z, starting at `z0`
 * (the inner collar face). Adds a lock-jaw collar after them when asked.
 * Returns the z just past the last item.
 */
export function loadPlates(parent: THREE.Object3D, z0: number, specs: PlateSpec[], collar = false) {
  let z = z0;
  for (const spec of specs) {
    const { t } = plateSize(spec);
    plate(parent, spec).position.z = z + t / 2;
    z += t + 0.002;
  }
  if (collar) {
    lockJaw(parent, z);
    z += 0.04;
  }
  return z;
}

/** Lock-jaw collar clip starting at `z` on a 50 mm sleeve along local z. */
export function lockJaw(parent: THREE.Object3D, z: number) {
  const m = mats();
  const g = node(parent, 0, 0, z);
  const ring = mesh(
    lathe(
      [
        [0.026, 0],
        [0.04, 0],
        [0.044, 0.005, true],
        [0.044, 0.031, true],
        [0.04, 0.036],
        [0.026, 0.036],
        [0.026, 0],
      ],
      28,
    ),
    m.uhmw,
    g,
  );
  ring.rotation.x = Math.PI / 2;
  block(g, 0, 0.05, 0.018, 0.03, 0.02, 0.034, m.uhmw, 0.005);
  const lever = block(g, 0.035, 0.058, 0.018, 0.075, 0.012, 0.024, m.accent, 0.005);
  lever.rotation.z = -0.25;
  return g;
}

/** Plate storage horn welded to a frame face at (x, y, z), pointing along `side`·z, loaded with plates. */
export function storageHorn(parent: THREE.Object3D, x: number, y: number, z: number, side: number, specs: PlateSpec[]) {
  const m = mats();
  const horn = node(parent, x, y, z);
  horn.rotation.y = side > 0 ? 0 : Math.PI;
  mesh(cyl(0.05, 0.008, 24), m.frameDark, horn).rotation.x = Math.PI / 2;
  at(mesh(cyl(0.025, 0.26, 20), m.steel, horn), 0, 0, 0.13, Math.PI / 2);
  at(mesh(cyl(0.03, 0.01, 20), m.uhmw, horn), 0, 0, 0.262, Math.PI / 2);
  let from = 0.01;
  for (const spec of specs) {
    const { t } = plateSize(spec);
    plate(horn, spec).position.z = from + t / 2;
    from += t + 0.003;
  }
  return horn;
}

// ------------------------------------------------------------------- bars

/**
 * Knurled 28 mm shaft of an Olympic bar along z, between ±`half`, with the
 * standard smooth rings and centre knurl.
 */
export function shaft(parent: THREE.Object3D, half = 0.66, r = 0.014) {
  const m = mats();
  const cuts = [-half, -0.625, -0.41, -0.4, -0.2, -0.08, 0.08, 0.2, 0.4, 0.41, 0.625, half];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    if (b - a <= 0) continue;
    const s = mesh(cyl(r, b - a, 20), i % 2 ? m.knurl : m.chrome, parent);
    at(s, 0, 0, (a + b) / 2, Math.PI / 2);
  }
}

/** Rotating 50 mm sleeve along local +z from `from` (with its collar) to `to`. */
export function sleeve(parent: THREE.Object3D, from: number, to: number) {
  const m = mats();
  const s = mesh(
    lathe(
      [
        [0.0142, from],
        [0.037, from],
        [0.039, from + 0.003, true],
        [0.039, from + 0.022, true],
        [0.037, from + 0.025],
        [0.0255, from + 0.028],
        [0.0255, to - 0.006],
        [0.022, to],
        [0, to],
      ],
      32,
    ),
    m.chrome,
    parent,
  );
  s.rotation.x = Math.PI / 2;
  const cap = mesh(cyl(0.012, 0.002, 20), m.accent, parent);
  at(cap, 0, 0, to + 0.0005, Math.PI / 2);
  return from + 0.028;
}

export interface Bar {
  group: THREE.Group;
  /** Rotating sleeve assemblies (+z side first); spin them about local z. */
  spins: THREE.Group[];
}

/** 2.2 m Olympic barbell along z, axis at the group origin. */
export function olympicBar(parent: THREE.Object3D, load: PlateSpec[] = [], collars = false): Bar {
  const group = node(parent);
  shaft(group);
  const spins = [1, -1].map((s) => {
    const side = node(group);
    side.rotation.y = s > 0 ? 0 : Math.PI;
    const spin = node(side);
    spin.userData.keep = true;
    const inner = sleeve(spin, 0.655, 1.1);
    loadPlates(spin, inner + 0.002, load, collars);
    return spin;
  });
  return { group, spins };
}

// --------------------------------------------------------- cable machines

/** Grooved pulley wheel in a two-cheek housing; wheel axle along local z. */
export function pulley(parent: THREE.Object3D, r = 0.045, housing = true) {
  const m = mats();
  const g = node(parent);
  const w = 0.024;
  const wheelGroup = node(g);
  const wheel = mesh(
    lathe(
      [
        [0.008, -w / 2],
        [r, -w / 2],
        [r, -w / 2 + 0.004],
        [r - 0.009, -0.002, true],
        [r - 0.009, 0.002, true],
        [r, w / 2 - 0.004],
        [r, w / 2],
        [0.008, w / 2],
        [0.008, -w / 2],
      ],
      28,
    ),
    m.aluminium,
    wheelGroup,
  );
  wheel.rotation.x = Math.PI / 2;
  // Spokes make the rotation visible.
  for (let k = 0; k < 3; k++) {
    const s = block(wheelGroup, 0, 0, 0, r * 1.5, 0.008, w + 0.002, m.plastic, 0.002);
    s.rotation.z = (k * Math.PI) / 3;
  }
  wheelGroup.userData.keep = true;
  if (housing) {
    const cheek = roundedPolygon(
      [
        [-r * 0.7, -r * 0.55],
        [r * 0.7, -r * 0.55],
        [r * 1.25, r * 0.4],
        [0, r * 1.45],
        [-r * 1.25, r * 0.4],
      ],
      r * 0.35,
    );
    for (const s of [1, -1]) {
      mesh(extrude(cheek, 0.004, 0.0015, 6, 1), m.frameDark, g).position.z = s * (w / 2 + 0.006);
    }
    mesh(cyl(0.01, w + 0.024, 12), m.steel, g).rotation.x = Math.PI / 2;
  }
  return { group: g, wheel: wheelGroup, r };
}

/** Stirrup (D) handle hanging below its attachment ring at the origin; grip along z. */
export function dHandle(parent: THREE.Object3D) {
  const m = mats();
  const g = node(parent);
  const ring = mesh(new THREE.TorusGeometry(0.014, 0.0035, 8, 20), m.steel, g);
  ring.position.y = -0.012;
  mesh(
    bentTube([v3(0, -0.024, 0), v3(0, -0.14, 0.07), v3(0, -0.14, -0.07), v3(0, -0.024, 0)], 0.006, 0.02, 8),
    m.chrome,
    g,
  );
  const grip = mesh(cyl(0.017, 0.11, 18), m.grip, g);
  at(grip, 0, -0.14, 0, Math.PI / 2);
  return g;
}

export interface WeightStack {
  group: THREE.Group;
  /** Plates above (and including) the pinned one, with the head plate and pin. */
  moving: THREE.Group;
  /** Height of the head plate's cable shackle above the stack base, at rest. */
  top: number;
  depth: number;
  /** Pin knob position in stack space (at rest). */
  pin: THREE.Vector3;
  /** Front face centre of the lowest plates, in stack space. */
  face: THREE.Vector3;
}

/**
 * Selectorized weight stack standing on y = 0, plates facing +x: rubber
 * bumpers, numbered plates, head plate with selector stem, guide rods up to
 * `rodTop`, and a selector pin in plate `pinFromTop` (0 = top plate).
 */
export function weightStack(parent: THREE.Object3D, count = 14, step = 5, pinFromTop = 5, rodTop = 1.6): WeightStack {
  const m = mats();
  const group = node(parent);
  const moving = node(group);
  moving.userData.keep = true;
  const D = 0.13;
  const W = 0.3;
  const H = 0.026;
  const base = 0.05;
  for (const z of [-0.105, 0.105]) {
    mesh(cyl(0.028, base, 16), m.rubber, group).position.set(0, base / 2, z);
    const rodMesh = mesh(cyl(0.011, rodTop, 16), m.chrome, group);
    rodMesh.position.set(0, rodTop / 2, z);
  }
  const labels = stackLabels(Array.from({ length: count }, (_, i) => (i + 1) * step));
  const pinned = count - 1 - pinFromTop;
  const plateGeo = boxTube(D, W, H - 0.0025, 0.005, 2);
  for (let i = 0; i < count; i++) {
    const target = i >= pinned ? moving : group;
    const y = base + i * H + H / 2;
    mesh(plateGeo, m.iron, target).position.set(0, y, 0);
    const row = count - 1 - i;
    const geo = new THREE.PlaneGeometry(0.075, 0.017);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (row + 1 - uv.getY(k)) / count);
    const lab = mesh(geo, decalMaterial(labels), target);
    lab.castShadow = false;
    at(lab, D / 2 + 0.0008, y, -0.075, 0, Math.PI / 2, 0);
  }
  const headY = base + count * H;
  const head = mesh(boxTube(D + 0.01, W + 0.01, 0.04, 0.008, 2), m.frameDark, moving);
  head.position.y = headY + 0.02;
  // Selector stem runs down through the plates; it shows when they separate.
  const stem = mesh(cyl(0.012, count * H + 0.03, 12), m.chrome, moving);
  stem.position.y = headY + 0.03 - (count * H + 0.03) / 2;
  const eye = mesh(new THREE.TorusGeometry(0.014, 0.004, 8, 16), m.steel, moving);
  eye.position.y = headY + 0.058;
  mesh(cyl(0.008, 0.02, 10), m.steel, moving).position.y = headY + 0.044;

  const pinY = base + pinned * H + H / 2;
  const pinKnob = knob(moving, 0.016);
  at(pinKnob, D / 2, pinY, 0, 0, 0, -Math.PI / 2);
  return {
    group,
    moving,
    top: headY + 0.058,
    depth: D,
    pin: v3(D / 2 + 0.05, pinY, 0),
    face: v3(D / 2, base + H * 2.5, 0.06),
  };
}
