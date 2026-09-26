import * as THREE from "three";
import type { MuscleId } from "@/lib/muscles";
import type { Skeleton, Vec3 } from "@/lib/anatomy/types";
import { loadBodyData, meshTier, peekBodyData, type BodyData } from "./body/cache";
import { createBodyDepthMaterial, createBodyMaterial, createPickMaterial, MUSCLE_COUNT, type BodyUniforms } from "./body/material";
import { MUSCLE_INDEX, muscleAt } from "./body/muscle-index";
import { BONE_COUNT, BoneSolver, emptyJoints, fillJoints, type GripSpec, type Support, type WorldJoints } from "./body/skeleton";
import { fibreNormalMap } from "./body/textures";

export type { GripSpec, GripStyle, Support, WorldJoints } from "./body/skeleton";

/** Authoring centimetres (y down, floor at 250) → three.js metres (y up). */
export function toWorld(p: Vec3, out = new THREE.Vector3()) {
  return out.set((p[0] - 160) / 100, (250 - p[1]) / 100, p[2] / 100);
}

export function toDir(d: Vec3, out = new THREE.Vector3()) {
  return out.set(d[0], -d[1], d[2]).normalize();
}

export type Emphasis = "primary" | "secondary";
export type Highlights = Partial<Record<MuscleId, Emphasis>>;

/** Colour theme of the figure. Only the colours are used. */
export interface Palette {
  skin: THREE.MeshStandardMaterial;
  shorts: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  hover: THREE.MeshStandardMaterial;
}

export function createPalette(): Palette {
  return {
    skin: new THREE.MeshStandardMaterial({ color: 0xd0ccc8 }),
    shorts: new THREE.MeshStandardMaterial({ color: 0x141417 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x3b3531 }),
    primary: new THREE.MeshStandardMaterial({ color: 0xd8211a, emissive: 0x8a0f05, emissiveIntensity: 0.35 }),
    secondary: new THREE.MeshStandardMaterial({ color: 0xf29a74 }),
    hover: new THREE.MeshStandardMaterial({ color: 0xfacc15 }),
  };
}

/** Joints of a solved skeleton in three.js space (allocates; use for one-off framing). */
export function worldJoints(sk: Skeleton): WorldJoints {
  return fillJoints(sk, emptyJoints());
}

const _q = new THREE.Quaternion();
const _t = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _v2 = new THREE.Vector2();
const _c = new THREE.Color();

/**
 * The anatomical figure: one skinned mesh (dual-quaternion skinning on the
 * GPU) generated procedurally from a sculpted distance field, with muscle
 * ids baked into its vertices so highlights, hover and picking are a
 * per-vertex lookup rather than separate meshes.
 */
export class BodyRig {
  readonly group = new THREE.Group();
  /** Joints of the current pose (updated in place; null until the first pose). */
  joints: WorldJoints | null = null;
  /** Increments whenever the pose or highlight state changes (for render-on-demand). */
  version = 0;
  readonly uniforms: BodyUniforms;
  private readonly solver = new BoneSolver();
  private readonly dq = new Float32Array(BONE_COUNT * 8);
  private readonly inverseBind: THREE.Matrix4[] = [];
  private body: THREE.Mesh | null = null;
  private pickMesh: THREE.Mesh | null = null;
  /** Resolves once the generated body mesh is attached. */
  readonly ready: Promise<void>;
  private disposed = false;
  private readonly pickScene = new THREE.Scene();
  private pickTarget: THREE.WebGLRenderTarget | null = null;
  private pickBuffer = new Uint8Array(0);
  private proxies: THREE.Mesh[] | null = null;
  private proxyVersion = -1;
  private hovered: MuscleId | null = null;
  private lastSkeleton: Skeleton | null = null;

  constructor(private readonly palette: Palette = createPalette()) {
    const tex = new THREE.DataTexture(this.dq, BONE_COUNT * 2, 1, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this.uniforms = {
      uBoneDQ: { value: tex },
      uMuscle: { value: new Float32Array(MUSCLE_COUNT) },
      uHover: { value: -1 },
      uFibreMap: { value: sharedFibreMap() },
      uPulse: { value: 0 },
      uDetail: { value: 1 },
      uSkin: { value: new THREE.Color() },
      uPrimary: { value: new THREE.Color() },
      uSecondary: { value: new THREE.Color() },
      uHoverColor: { value: new THREE.Color() },
      uShorts: { value: new THREE.Color() },
      uHair: { value: new THREE.Color() },
      uLine: { value: 1 },
      uFade: { value: 1 },
      uDefine: { value: 0 },
      uAnchor: { value: Array.from({ length: (MUSCLE_COUNT + 1) * 2 }, () => new THREE.Vector3()) },
    };
    this.syncPalette();
    // The solver starts in the bind pose: its matrices are the bind matrices.
    for (let b = 0; b < BONE_COUNT; b++) this.inverseBind.push(this.solver.matrices[b].clone().invert());
    for (let b = 0; b < BONE_COUNT; b++) this.dq[b * 8 + 3] = 1;
    const now = peekBodyData();
    if (now) {
      this.attach(now);
      this.ready = Promise.resolve();
    } else {
      this.ready = loadBodyData().then((d) => {
        if (!this.disposed) this.attach(d);
      });
    }
  }

  private attach(data: BodyData) {
    computeAnchors(data, this.uniforms.uAnchor.value);
    // The sculpted body is smooth: carve muscle borders in the shader and soften the fibres.
    const sculpted = !!data.stats.regions.sculpted;
    this.uniforms.uDefine.value = sculpted ? 1 : 0;
    this.uniforms.uDetail.value = sculpted ? 0.8 : 1;
    const geometry = sharedGeometry(data);
    const body = new THREE.Mesh(geometry, createBodyMaterial(this.uniforms));
    body.customDepthMaterial = createBodyDepthMaterial(this.uniforms);
    body.castShadow = true;
    body.receiveShadow = true;
    body.frustumCulled = false;
    // Raycasting a GPU-skinned body on the CPU would hit the bind pose; use pick() / muscleMeshes.
    body.raycast = () => {};
    this.body = body;
    this.group.add(body);
    this.pickMesh = new THREE.Mesh(geometry, createPickMaterial(this.uniforms));
    this.pickMesh.frustumCulled = false;
    this.pickMesh.matrixAutoUpdate = false;
    this.pickScene.add(this.pickMesh);
    this.version++;
  }

  /** Invisible per-muscle proxy volumes that follow the pose, for CPU raycasting. */
  get muscleMeshes(): THREE.Mesh[] {
    const data = peekBodyData();
    if (!data) return [];
    if (!this.proxies) this.proxies = buildProxies(data, this.group);
    if (this.proxyVersion !== this.version) {
      this.proxyVersion = this.version;
      for (const p of this.proxies) {
        const d = p.userData as { bone: number; local: THREE.Matrix4 };
        p.matrix.multiplyMatrices(this.skinMatrix(d.bone, _m), d.local);
        p.matrixWorld.multiplyMatrices(this.group.matrixWorld, p.matrix);
      }
    }
    return this.proxies;
  }

  /** How each hand holds equipment ([side 0, side 1]); set by the prop set every frame. */
  setGrips(grips: (GripSpec | null)[]) {
    const s = this.solver;
    const a = grips[0] ?? null;
    const b = grips[1] ?? null;
    if (s.grips[0] === a && s.grips[1] === b) return;
    s.grips[0] = a;
    s.grips[1] = b;
    if (this.lastSkeleton) this.update(this.lastSkeleton);
  }

  /** Surfaces a free hand can rest flat on (the floor is always included). */
  setSupports(supports: Support[]) {
    this.solver.supports = [{ y: 0 }, ...supports];
    if (this.lastSkeleton) this.update(this.lastSkeleton);
  }

  update(sk: Skeleton) {
    this.lastSkeleton = sk;
    this.solver.update(sk);
    this.joints = this.solver.joints;
    const M = this.solver.matrices;
    const dq = this.dq;
    for (let b = 0; b < BONE_COUNT; b++) {
      _m.multiplyMatrices(M[b], this.inverseBind[b]);
      _m.decompose(_t, _q, _s);
      const o = b * 8;
      dq[o] = _q.x;
      dq[o + 1] = _q.y;
      dq[o + 2] = _q.z;
      dq[o + 3] = _q.w;
      const tx = _t.x;
      const ty = _t.y;
      const tz = _t.z;
      dq[o + 4] = 0.5 * (tx * _q.w + ty * _q.z - tz * _q.y);
      dq[o + 5] = 0.5 * (-tx * _q.z + ty * _q.w + tz * _q.x);
      dq[o + 6] = 0.5 * (tx * _q.y - ty * _q.x + tz * _q.w);
      dq[o + 7] = -0.5 * (tx * _q.x + ty * _q.y + tz * _q.z);
    }
    this.uniforms.uBoneDQ.value.needsUpdate = true;
    this.version++;
  }

  private skinMatrix(bone: number, out: THREE.Matrix4) {
    return out.multiplyMatrices(this.solver.matrices[bone], this.inverseBind[bone]);
  }

  setHighlights(h: Highlights) {
    this.syncPalette();
    const u = this.uniforms.uMuscle.value;
    u.fill(0);
    for (const [m, e] of Object.entries(h) as [MuscleId, Emphasis][]) u[MUSCLE_INDEX[m]] = e === "primary" ? 2 : 1;
    this.version++;
  }

  setHovered(m: MuscleId | null) {
    if (m === this.hovered) return;
    this.hovered = m;
    this.uniforms.uHover.value = m ? MUSCLE_INDEX[m] : -1;
    this.version++;
  }

  /** Target-muscle pulse, 0..1. */
  setPulse(p: number) {
    this.uniforms.uPulse.value = p;
  }

  private syncPalette() {
    const u = this.uniforms;
    const p = this.palette;
    u.uSkin.value.copy(p.skin.color);
    u.uPrimary.value.copy(p.primary.color);
    u.uSecondary.value.copy(p.secondary.color);
    u.uHoverColor.value.copy(p.hover.color);
    u.uShorts.value.copy(p.shorts.color);
    u.uHair.value.copy(p.hair.color);
  }

  /**
   * GPU picking: renders muscle ids in a small window around the pointer and
   * returns the id nearest the centre within `radius` CSS pixels (a generous
   * radius makes touch picking forgiving).
   */
  pick(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, ndcX: number, ndcY: number, radius = 2): MuscleId | null {
    const size = renderer.getSize(_v2);
    const w = size.x;
    const h = size.y;
    if (!w || !h || !this.pickMesh) return null;
    const win = Math.max(3, Math.ceil(radius) * 2 + 1);
    if (!this.pickTarget || this.pickTarget.width !== win) {
      this.pickTarget?.dispose();
      this.pickTarget = new THREE.WebGLRenderTarget(win, win);
      this.pickBuffer = new Uint8Array(win * win * 4);
    }
    const px = ((ndcX + 1) / 2) * w;
    const py = ((1 - ndcY) / 2) * h;
    camera.setViewOffset(w, h, px - win / 2, py - win / 2, win, win);
    this.pickMesh.matrixWorld.copy(this.group.matrixWorld);
    const prevTarget = renderer.getRenderTarget();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(_c);
    const prevShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.pickTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.pickScene, camera);
    renderer.readRenderTargetPixels(this.pickTarget, 0, 0, win, win, this.pickBuffer);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(_c, prevAlpha);
    renderer.shadowMap.autoUpdate = prevShadow;
    camera.clearViewOffset();
    let best = -1;
    let bestD = Infinity;
    const c = (win - 1) / 2;
    for (let y = 0; y < win; y++) {
      for (let x = 0; x < win; x++) {
        const id = this.pickBuffer[(y * win + x) * 4];
        if (!id) continue;
        const d = (x - c) * (x - c) + (y - c) * (y - c);
        if (d < bestD && d <= radius * radius + 0.5) {
          bestD = d;
          best = id - 1;
        }
      }
    }
    return best >= 0 ? muscleAt(best) : null;
  }

  dispose() {
    this.disposed = true;
    this.pickTarget?.dispose();
    (this.body?.material as THREE.Material | undefined)?.dispose();
    this.body?.customDepthMaterial?.dispose();
    (this.pickMesh?.material as THREE.Material | undefined)?.dispose();
    this.uniforms.uBoneDQ.value.dispose();
  }
}

// Shared resources ------------------------------------------------------------

let fibreMap: THREE.DataTexture | null = null;
function sharedFibreMap() {
  if (!fibreMap) fibreMap = fibreNormalMap(meshTier() === "high" ? 1024 : 512);
  return fibreMap;
}

/** Mean bind position (cm) of each (muscle, side) vertex set. */
function computeAnchors(d: BodyData, out: THREE.Vector3[]) {
  const n = d.position.length / 3;
  const acc = new Float64Array(out.length * 4);
  for (let v = 0; v < n; v++) {
    const m = Math.min(d.info[v * 4], MUSCLE_COUNT);
    const z = d.position[v * 3 + 2];
    const slot = m * 2 + (z > 0 ? 1 : 0);
    acc[slot * 4] += d.position[v * 3];
    acc[slot * 4 + 1] += d.position[v * 3 + 1];
    acc[slot * 4 + 2] += z;
    acc[slot * 4 + 3]++;
  }
  for (let i = 0; i < out.length; i++) {
    const c = acc[i * 4 + 3] || 1;
    out[i].set((acc[i * 4] / c) * 100, (acc[i * 4 + 1] / c) * 100, (acc[i * 4 + 2] / c) * 100);
  }
}

let geometry: THREE.BufferGeometry | null = null;
function sharedGeometry(d: BodyData) {
  if (geometry) return geometry;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(d.position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(d.normal, 3));
  g.setAttribute("aBones", new THREE.BufferAttribute(d.bones, 4));
  g.setAttribute("aWeights", new THREE.BufferAttribute(d.weights, 4, true));
  g.setAttribute("aInfo", new THREE.BufferAttribute(d.info, 4));
  g.setAttribute("aFibre", new THREE.BufferAttribute(d.fibre, 4, true));
  g.setAttribute("aExtra", new THREE.BufferAttribute(d.extra, 4));
  g.setAttribute("aFibreUv", new THREE.BufferAttribute(d.fuv, 2));
  g.setAttribute("aSeg", new THREE.BufferAttribute(d.seg, 4));
  g.setIndex(new THREE.BufferAttribute(d.index, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.3);
  geometry = g;
  return g;
}

const PROXY_GEO = new THREE.SphereGeometry(1, 12, 8);
const PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });

/**
 * One ellipsoid per (muscle, bone) cluster of vertices, fitted to the bind
 * mesh (mean + principal axes), placed each pose by that bone.
 */
function buildProxies(d: BodyData, parent: THREE.Object3D): THREE.Mesh[] {
  const n = d.position.length / 3;
  const acc = new Map<number, { n: number; s: number[]; c: number[] }>();
  for (let v = 0; v < n; v++) {
    const m = d.info[v * 4];
    if (m === 255 || d.weights[v * 4] < 170) continue;
    const key = m * 256 + d.bones[v * 4];
    let a = acc.get(key);
    if (!a) acc.set(key, (a = { n: 0, s: [0, 0, 0], c: [0, 0, 0, 0, 0, 0] }));
    const x = d.position[v * 3];
    const y = d.position[v * 3 + 1];
    const z = d.position[v * 3 + 2];
    a.n++;
    a.s[0] += x;
    a.s[1] += y;
    a.s[2] += z;
    a.c[0] += x * x;
    a.c[1] += y * y;
    a.c[2] += z * z;
    a.c[3] += x * y;
    a.c[4] += x * z;
    a.c[5] += y * z;
  }
  const out: THREE.Mesh[] = [];
  for (const [key, a] of acc) {
    if (a.n < 40) continue;
    const mx = a.s[0] / a.n;
    const my = a.s[1] / a.n;
    const mzv = a.s[2] / a.n;
    const cxx = a.c[0] / a.n - mx * mx;
    const cyy = a.c[1] / a.n - my * my;
    const czz = a.c[2] / a.n - mzv * mzv;
    const cxy = a.c[3] / a.n - mx * my;
    const cxz = a.c[4] / a.n - mx * mzv;
    const cyz = a.c[5] / a.n - my * mzv;
    const { vectors, values } = eigen3([
      [cxx, cxy, cxz],
      [cxy, cyy, cyz],
      [cxz, cyz, czz],
    ]);
    const r = (i: number) => Math.sqrt(Math.max(values[i], 1e-6)) * 1.9;
    const basis = new THREE.Matrix4().makeBasis(
      vectors[0].multiplyScalar(r(0)),
      vectors[1].multiplyScalar(r(1)),
      vectors[2].multiplyScalar(r(2)),
    );
    basis.setPosition(mx, my, mzv);
    const mesh = new THREE.Mesh(PROXY_GEO, PROXY_MAT);
    mesh.matrixAutoUpdate = false;
    mesh.userData = { muscle: muscleAt(Math.floor(key / 256)), bone: key % 256, local: basis };
    parent.add(mesh);
    out.push(mesh);
  }
  return out;
}

/** Eigen-decomposition of a symmetric 3×3 matrix (cyclic Jacobi). */
function eigen3(a: number[][]) {
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 12; sweep++) {
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      if (Math.abs(a[p][q]) < 1e-14) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  return {
    values: [a[0][0], a[1][1], a[2][2]],
    vectors: [0, 1, 2].map((i) => new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize()),
  };
}
