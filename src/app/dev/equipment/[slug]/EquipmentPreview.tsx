"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EQUIPMENT_CATALOG, getEquipmentEntry, type EquipmentSlug } from "@/lib/equipment-catalog";
import { VIEWS, type View } from "../views";

interface Props {
  slug: EquipmentSlug;
  active: boolean;
  /** Freeze the animation at this time (seconds) for screenshots. */
  time?: number;
  view: View;
  labels: boolean;
}

interface Api {
  setView(v: View): void;
}

/** Dev-only viewer: one equipment model with labelled hotspots and an "in use" toggle. */
export default function EquipmentPreview({ slug, active: initialActive, time, view: initialView, labels }: Props) {
  const entry = getEquipmentEntry(slug)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const apiRef = useRef<Api | null>(null);
  const [active, setActive] = useState(initialActive);
  const [view, setView] = useState<View>(initialView);
  const [info, setInfo] = useState<{ missing: string[]; extra: string[]; calls: number; triangles: number } | null>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let disposed = false;
    let raf = 0;
    let observer: ResizeObserver | undefined;
    let cleanup = () => {};

    Promise.all([import("@/lib/three/stage"), import("@/lib/three/equipment"), import("../preview")]).then(
      ([{ Stage }, { buildEquipmentModel, equipmentBounds }, P]) => {
        if (disposed) return;
        const stage = new Stage(canvas, { interactive: true });
        stage.rig.group.visible = false;
        const model = buildEquipmentModel(slug);
        stage.scene.add(model.group);
        const box = P.modelBox(model, equipmentBounds(slug));
        P.fitShadows(stage, box);
        let current: View = initialView;

        const frame = () => {
          const { target, dist } = P.frameCamera(stage.camera, box, current);
          if (stage.controls) {
            stage.controls.target.copy(target);
            stage.controls.minDistance = dist * 0.25;
            stage.controls.maxDistance = dist * 3;
            stage.controls.update();
          }
        };
        apiRef.current = {
          setView(v) {
            current = v;
            frame();
          },
        };
        observer = new ResizeObserver(([e]) => {
          stage.renderer.setSize(e.contentRect.width, e.contentRect.height, false);
          stage.camera.aspect = e.contentRect.width / Math.max(1, e.contentRect.height);
          frame();
        });
        observer.observe(canvas);

        const ids = entry.parts.map((p) => p.id);
        const have = Object.keys(model.hotspots);
        if (time !== undefined) P.simulate(model, time, activeRef.current);

        let n = 0;
        let hidden: Record<string, boolean> = {};
        const loop = (now: number) => {
          if (time === undefined) model.update?.(now / 1000, activeRef.current);
          stage.render(now / 1000);
          const check = n % 20 === 5;
          const dots = P.projectDots(model, stage.camera, check);
          for (const d of dots) {
            if (check) hidden[d.id] = d.hidden;
            const el = dotRefs.current[d.id];
            if (!el) continue;
            el.style.left = `${d.x * 100}%`;
            el.style.top = `${d.y * 100}%`;
            el.style.opacity = hidden[d.id] ? "0.45" : "1";
          }
          if (n === 2) {
            setInfo({
              missing: ids.filter((id) => !have.includes(id)),
              extra: have.filter((id) => !ids.includes(id)),
              calls: stage.renderer.info.render.calls,
              triangles: stage.renderer.info.render.triangles,
            });
          }
          n++;
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        cleanup = () => {
          stage.scene.remove(model.group);
          model.dispose();
          stage.dispose();
          hidden = {};
        };
      },
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      apiRef.current = null;
      cleanup();
    };
    // The view is applied imperatively through apiRef; only a new model or frozen time rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, time]);

  const changeView = (v: View) => {
    setView(v);
    apiRef.current?.setView(v);
  };

  const index = EQUIPMENT_CATALOG.findIndex((e) => e.slug === slug);
  const prev = EQUIPMENT_CATALOG[(index + EQUIPMENT_CATALOG.length - 1) % EQUIPMENT_CATALOG.length];
  const next = EQUIPMENT_CATALOG[(index + 1) % EQUIPMENT_CATALOG.length];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-zinc-900 text-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
        <Link href="/dev/equipment" className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
          All
        </Link>
        <Link href={`/dev/equipment/${prev.slug}`} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
          ←
        </Link>
        <h1 className="text-lg font-bold">{entry.name}</h1>
        <Link href={`/dev/equipment/${next.slug}`} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
          →
        </Link>
        <button
          type="button"
          onClick={() => setActive((a) => !a)}
          className={`ml-2 rounded-full px-3 py-1 font-semibold ${active ? "bg-amber-300 text-zinc-900" : "bg-white/10"}`}
        >
          {active ? "In use: on" : "In use: off"}
        </button>
        <div className="flex gap-1">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={`rounded-full px-2.5 py-1 ${view === v ? "bg-white text-zinc-900" : "bg-white/10"}`}
            >
              {v}
            </button>
          ))}
        </div>
        {info && (
          <span className="ml-auto text-xs text-zinc-400">
            {info.calls} draw calls · {info.triangles.toLocaleString()} tris
            {info.missing.length > 0 && <b className="text-red-400"> · missing hotspots: {info.missing.join(", ")}</b>}
            {info.extra.length > 0 && <b className="text-amber-300"> · extra: {info.extra.join(", ")}</b>}
          </span>
        )}
      </div>
      <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-white to-zinc-200">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
        {entry.parts.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              dotRefs.current[p.id] = el;
            }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: "-100px" }}
          >
            <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow" />
            {labels && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-zinc-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {p.label} <span className="text-zinc-400">({p.id})</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
