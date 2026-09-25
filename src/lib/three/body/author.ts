import { CH_TORSO } from "./chains";
import {
  L_BASE,
  L_MUSCLE,
  L_OVERLAY,
  L_SHORTS_FILL,
  Sculpt,
  type EllipsoidSpec,
  type LoftSpec,
  type PrimMeta,
  type PrimOpts,
  type SpindleSpec,
  type V3,
} from "./sdf";

/**
 * Authoring helpers for the sculpt: primitives are declared for the midline
 * and side 0 only; paired primitives are mirrored to side 1 automatically.
 */

type Spec =
  | { kind: "ellipsoid"; e: EllipsoidSpec; o: PrimOpts; mirror: boolean }
  | { kind: "cone"; a: V3; b: V3; ra: number; rb: number; o: PrimOpts; mirror: boolean }
  | { kind: "spindle"; s: SpindleSpec; o: PrimOpts; mirror: boolean }
  | { kind: "loft"; l: LoftSpec; o: PrimOpts; mirror: boolean };

export const mz = (v: V3): V3 => [v[0], v[1], -v[2]];

/** Chain of the other side (torso chain is shared). */
export function mirrorChain(c: number) {
  if (c === CH_TORSO) return c;
  if (c <= 2) return c === 1 ? 2 : 1;
  if (c <= 4) return c === 3 ? 4 : 3;
  if (c <= 6) return c === 5 ? 6 : 5;
  return c < 12 ? c + 5 : c - 5;
}

export class Author {
  private specs: Spec[] = [];
  private groups = new Map<string, number>();
  /** When true, subsequent primitives are mirrored to side 1. */
  paired = true;

  group(name: string) {
    let g = this.groups.get(name);
    if (g === undefined) {
      g = this.groups.size + 1;
      this.groups.set(name, g);
    }
    return g;
  }

  ellipsoid(e: EllipsoidSpec, o: PrimOpts = {}) {
    this.specs.push({ kind: "ellipsoid", e, o, mirror: this.paired });
  }

  cone(a: V3, b: V3, ra: number, rb: number, o: PrimOpts = {}) {
    this.specs.push({ kind: "cone", a, b, ra, rb, o, mirror: this.paired });
  }

  spindle(s: SpindleSpec, o: PrimOpts = {}) {
    this.specs.push({ kind: "spindle", s, o, mirror: this.paired });
  }

  loft(l: LoftSpec, o: PrimOpts = {}) {
    this.specs.push({ kind: "loft", l, o, mirror: this.paired });
  }

  /** Runs `fn` with mirroring off (midline primitives). */
  midline(fn: () => void) {
    const p = this.paired;
    this.paired = false;
    fn();
    this.paired = p;
  }

  /** Emits every primitive into a sculpt, grouped by layer so the evaluator sees base → muscle → fill → overlay. */
  emit(sculpt: Sculpt) {
    const order = [L_BASE, L_MUSCLE, L_SHORTS_FILL, L_OVERLAY];
    for (const layer of order) {
      for (const s of this.specs) {
        if ((s.o.layer ?? L_BASE) !== layer) continue;
        this.put(sculpt, s, false);
        if (s.mirror) this.put(sculpt, s, true);
      }
    }
  }

  private put(sculpt: Sculpt, s: Spec, mirror: boolean) {
    const o = mirror ? mirrorOpts(s.o) : s.o;
    switch (s.kind) {
      case "ellipsoid":
        sculpt.ellipsoid(mirror ? { center: mz(s.e.center), axes: [mz(s.e.axes[0]), mz(s.e.axes[1]), mz(s.e.axes[2])], radii: s.e.radii } : s.e, o);
        break;
      case "cone":
        sculpt.cone(mirror ? mz(s.a) : s.a, mirror ? mz(s.b) : s.b, s.ra, s.rb, o);
        break;
      case "spindle": {
        const sp = s.s;
        const flatDir = sp.flatDir === undefined ? undefined : Array.isArray(sp.flatDir[0]) ? (sp.flatDir as V3[]).map(mz) : mz(sp.flatDir as V3);
        sculpt.spindle(mirror ? { ...sp, pts: sp.pts.map(mz), flatDir } : sp, o);
        break;
      }
      case "loft": {
        const l = s.l;
        sculpt.loft(
          mirror
            ? {
                a: mz(l.a),
                b: mz(l.b),
                front: mz(l.front),
                sections: l.sections.map((c) => ({ ...c, s: c.m, m: c.s, os: -(c.os ?? 0) })),
                bumps: l.bumps?.map((b) => ({
                  ...b,
                  pts: b.pts.map(([a, t]) => [-a, t] as [number, number]),
                  group: b.group + 1000,
                  meta: {
                    ...b.meta,
                    chainA: b.meta.chainA === undefined ? undefined : mirrorChain(b.meta.chainA),
                    chainB: b.meta.chainB === undefined ? undefined : mirrorChain(b.meta.chainB),
                  },
                })),
              }
            : l,
          o,
        );
        break;
      }
    }
  }
}

function mirrorOpts(o: PrimOpts): PrimOpts {
  const m: Partial<PrimMeta> = { ...(o.meta ?? {}) };
  if (m.chainA !== undefined) m.chainA = mirrorChain(m.chainA);
  if (m.chainB !== undefined) m.chainB = mirrorChain(m.chainB);
  if (m.fibreDir) m.fibreDir = mz(m.fibreDir);
  if (m.fibreTo) m.fibreTo = mz(m.fibreTo);
  return { ...o, group: o.group !== undefined && o.group >= 0 ? o.group + 1000 : o.group, meta: m };
}
