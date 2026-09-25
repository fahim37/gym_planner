"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EQUIPMENT_CATALOG, type EquipmentSlug } from "@/lib/equipment-catalog";
import type { Dot } from "./preview";
import type { View } from "./views";

interface Shot {
  src: string;
  /** ?check=1: largest drift (mm) of any part / hotspot after running active then idle. */
  drift?: [number, number];
  dots: Dot[];
  missing: string[];
  calls: number;
  triangles: number;
  ms: number;
}

interface Props {
  check?: boolean;
  active: boolean;
  time?: number;
  view: View;
  only?: string[];
  size: number;
}

/**
 * Every equipment model rendered one after another with a single offscreen
 * WebGL context, as stills with their hotspots overlaid.
 */
export default function EquipmentGrid({ check, active, time, view, only, size }: Props) {
  const [shots, setShots] = useState<Partial<Record<EquipmentSlug, Shot>>>({});
  const [memory, setMemory] = useState<string | null>(null);
  const entries = EQUIPMENT_CATALOG.filter((e) => !only || only.includes(e.slug));
  const key = entries.map((e) => e.slug).join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ Stage }, { buildEquipmentModel, equipmentBounds }, P] = await Promise.all([
        import("@/lib/three/stage"),
        import("@/lib/three/equipment"),
        import("./preview"),
      ]);
      const canvas = document.createElement("canvas");
      const stage = new Stage(canvas, { preserveDrawingBuffer: true });
      stage.rig.group.visible = false;
      stage.renderer.setPixelRatio(1);
      const w = size;
      const h = Math.round(size * 0.75);
      stage.renderer.setSize(w, h, false);
      stage.camera.aspect = w / h;
      for (const e of EQUIPMENT_CATALOG) {
        if (cancelled) break;
        if (!key.split(",").includes(e.slug)) continue;
        await new Promise((r) => requestAnimationFrame(r));
        const t0 = performance.now();
        const model = buildEquipmentModel(e.slug);
        const ms = performance.now() - t0;
        stage.scene.add(model.group);
        const box = P.modelBox(model, active ? equipmentBounds(e.slug) : undefined);
        if (time !== undefined) P.simulate(model, time, active);
        P.fitShadows(stage, box);
        P.frameCamera(stage.camera, box, view);
        stage.render(0);
        const shot: Shot = {
          src: canvas.toDataURL("image/png"),
          dots: P.projectDots(model, stage.camera),
          missing: e.parts.map((p) => p.id).filter((id) => !(id in model.hotspots)),
          calls: stage.renderer.info.render.calls,
          triangles: stage.renderer.info.render.triangles,
          ms,
        };
        stage.scene.remove(model.group);
        model.dispose();
        if (check) shot.drift = P.restDrift(buildEquipmentModel(e.slug), buildEquipmentModel(e.slug));
        if (!cancelled) setShots((s) => ({ ...s, [e.slug]: shot }));
      }
      const mem = stage.renderer.info.memory;
      if (!cancelled) setMemory(`after disposing every model: ${mem.geometries} geometries, ${mem.textures} textures on the GPU`);
      stage.dispose();
    })();
    return () => {
      cancelled = true;
    };
  }, [check, active, time, view, key, size]);

  return (
    <main className="grid gap-3 bg-zinc-900 p-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(size, 420)}px, 1fr))` }}>
      {memory && <p className="col-span-full text-xs text-zinc-400">{memory}</p>}
      {entries.map((e) => {
        const shot = shots[e.slug];
        return (
          <Link key={e.slug} href={`/dev/equipment/${e.slug}`} className="overflow-hidden rounded-2xl bg-zinc-800 text-white">
            <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-zinc-200">
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                <img src={shot.src} alt={e.name} className="absolute inset-0 h-full w-full" />
              ) : (
                <div className="absolute inset-0 animate-pulse bg-zinc-300" />
              )}
              {shot?.dots.map((d) => (
                <div
                  key={d.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, opacity: d.hidden ? 0.45 : 1 }}
                >
                  <span className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 shadow" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-zinc-900/75 px-1 text-[9px] font-semibold">
                    {d.id}
                    {d.by && <span className="text-red-300"> ({d.by})</span>}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-semibold">{e.name}</span>
              {shot && (
                <span className="text-[11px] text-zinc-400">
                  {shot.calls} calls · {(shot.triangles / 1000).toFixed(0)}k tris · {shot.ms.toFixed(0)} ms
                  {shot.missing.length > 0 && <b className="text-red-400"> · missing {shot.missing.join(", ")}</b>}
                  {shot.drift && (
                    <b className={shot.drift[0] > 1 || shot.drift[1] > 1 ? "text-red-400" : "text-emerald-400"}>
                      {" "}
                      · drift {shot.drift[0].toFixed(2)} / {shot.drift[1].toFixed(2)} mm
                    </b>
                  )}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </main>
  );
}
