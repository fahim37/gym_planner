import * as THREE from "three";
import type { WorldJoints } from "./skeleton";

/**
 * Soft contact shadow: a floor quad whose shader computes analytic ambient
 * occlusion from capsules along the figure's limbs and torso. No extra
 * render passes; it stays soft at any resolution.
 */
const CAPSULES = 16;

export class ContactShadow {
  readonly mesh: THREE.Mesh;
  private readonly a = Array.from({ length: CAPSULES }, () => new THREE.Vector4());
  private readonly b = Array.from({ length: CAPSULES }, () => new THREE.Vector4());
  private readonly material: THREE.ShaderMaterial;

  constructor(size = 5) {
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uA: { value: this.a }, uB: { value: this.b }, uStrength: { value: 0.55 } },
      vertexShader: /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
      fragmentShader: /* glsl */ `
uniform vec4 uA[${CAPSULES}];
uniform vec4 uB[${CAPSULES}];
uniform float uStrength;
varying vec3 vWorld;
void main() {
  float occ = 0.0;
  for (int i = 0; i < ${CAPSULES}; i++) {
    vec3 a = uA[i].xyz;
    vec3 b = uB[i].xyz;
    float r = uA[i].w;
    if (r <= 0.0) continue;
    vec3 ab = b - a;
    float t = clamp(dot(vWorld - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    vec3 c = a + ab * t;
    vec3 d = c - vWorld;
    float l = length(d);
    // Sphere occlusion (cosine-weighted) with a soft falloff.
    float o = (r * r) / (l * l + 1e-4) * max(d.y / l, 0.0);
    occ += o * smoothstep(r * 5.0, r * 0.6, l);
  }
  float a = uStrength * (1.0 - exp(-occ * 1.6));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
    });
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = 0.001;
    this.mesh.renderOrder = -1;
    this.mesh.raycast = () => {};
  }

  /** Places the occluder capsules along the current skeleton. */
  update(j: WorldJoints) {
    let n = 0;
    const put = (p: THREE.Vector3, q: THREE.Vector3, r: number) => {
      if (n >= CAPSULES) return;
      this.a[n].set(p.x, p.y, p.z, r);
      this.b[n].set(q.x, q.y, q.z, 0);
      n++;
    };
    put(j.pelvis, j.chest, 0.15);
    for (const s of j.sides) {
      put(s.hip, s.knee, 0.075);
      put(s.knee, s.ankle, 0.055);
      put(s.heel, s.toe, 0.045);
      put(s.shoulder, s.elbow, 0.05);
      put(s.elbow, s.wrist, 0.04);
      put(s.wrist, s.hand, 0.04);
    }
    put(j.head, j.head, 0.11);
    for (; n < CAPSULES; n++) this.a[n].w = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
