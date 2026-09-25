"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Pose } from "@/lib/anatomy/types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import type { Highlights } from "@/lib/three/rig";
import type { Stage } from "@/lib/three/stage";

/** Relaxed A-pose so every muscle is visible and clickable. */
const A_POSE: Pose = {
  hip: [160, 156],
  torso: 0,
  arms: [{ angles: [4, 10], spread: [20, 16] }],
  legs: [{ ik: { x: 161, y: 245, z: 15 }, pole: [1, 0, 0.1] }],
};

interface Props {
  /** Muscles to show highlighted. */
  highlights?: Highlights;
  /** Navigate to the muscle page on click (default true). */
  navigate?: boolean;
  autoRotate?: boolean;
  /** Which side of the body to face first. */
  view?: "front" | "back";
  className?: string;
}

/** Rotatable 3D body. Hover a muscle to name it, click to see its exercises. */
export default function BodyExplorer({ highlights = {}, navigate = true, autoRotate = true, view = "front", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState<{ id: MuscleId; x: number; y: number } | null>(null);
  const highlightKey = JSON.stringify(highlights);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let stage: Stage | undefined;
    let raf = 0;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let hovered: MuscleId | null = null;
    let interacted = false;
    const cleanups: (() => void)[] = [];

    import("@/lib/three/stage").then(({ Stage }) => {
      if (disposed) return;
      const s = new Stage(canvas, { interactive: true });
      stage = s;
      s.rig.setHighlights(JSON.parse(highlightKey));
      s.fit([A_POSE]);
      s.setPreset(view);
      s.pose(A_POSE);
      if (s.controls) {
        s.controls.autoRotate = autoRotate;
        s.controls.autoRotateSpeed = 1.2;
        s.controls.enableZoom = false;
      }
      observer = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
      observer.observe(canvas);

      const ndc = (ev: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((ev.clientX - r.left) / r.width) * 2 - 1, y: -((ev.clientY - r.top) / r.height) * 2 + 1, px: ev.clientX - r.left, py: ev.clientY - r.top };
      };
      const onMove = (ev: PointerEvent) => {
        const p = ndc(ev);
        const id = s.pick(p.x, p.y);
        if (id !== hovered) {
          hovered = id;
          s.rig.setHovered(id);
          canvas.style.cursor = id && navigate ? "pointer" : "grab";
        }
        setHover(id ? { id, x: p.px, y: p.py } : null);
      };
      const onLeave = () => {
        hovered = null;
        s.rig.setHovered(null);
        setHover(null);
      };
      let downAt = { x: 0, y: 0 };
      const onDown = (ev: PointerEvent) => {
        downAt = { x: ev.clientX, y: ev.clientY };
        interacted = true;
        if (s.controls) s.controls.autoRotate = false;
      };
      const onUp = (ev: PointerEvent) => {
        // Treat as a click only if the pointer barely moved (not an orbit drag).
        if (Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) return;
        const p = ndc(ev);
        const id = s.pick(p.x, p.y);
        if (id && navigate) router.push(`/muscles/${id}`);
      };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", onUp);
      cleanups.push(() => {
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerup", onUp);
      });

      const loop = (now: number) => {
        if (!interacted && s.controls) s.controls.autoRotate = autoRotate;
        s.render(now / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      cleanups.forEach((c) => c());
      stage?.dispose();
    };
  }, [highlightKey, navigate, autoRotate, view, router]);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-white to-zinc-200 ${className ?? ""}`}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-label="Interactive 3D muscle map" />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-zinc-900 px-3 py-1.5 text-center shadow-lg"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          <div className="text-sm font-bold text-white">{MUSCLES[hover.id].name}</div>
          <div className="text-[11px] text-zinc-400">{MUSCLES[hover.id].latin}</div>
        </div>
      )}
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-zinc-500">
        Drag to rotate · {navigate ? "tap a muscle to see its exercises" : "hover a muscle to name it"}
      </p>
    </div>
  );
}
