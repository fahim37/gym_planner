"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Pose } from "@/lib/anatomy/types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import { exercisesForMuscle } from "@/lib/queries";
import type { Highlights } from "@/lib/three/rig";
import type { Stage } from "@/lib/three/stage";
import BottomSheet from "./BottomSheet";
import ExerciseThumb from "./ExerciseThumb";
import { ChevronRight, CollapseIcon, ExpandIcon } from "./icons";

type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
const fullscreenElement = () => {
  const d = document as FullscreenDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

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

/** Bottom-sheet summary of a tapped muscle (touch devices). */
function MuscleSheet({ id }: { id: MuscleId }) {
  const muscle = MUSCLES[id];
  const { primary, secondary } = exercisesForMuscle(id);
  const top = [...primary, ...secondary].slice(0, 3);
  const total = primary.length + secondary.length;
  return (
    <div className="pb-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">{muscle.region}</p>
      <h2 className="display mt-1 text-4xl">{muscle.name}</h2>
      <p className="mt-0.5 text-sm italic text-zinc-400">{muscle.latin}</p>
      <p className="mt-3 text-zinc-200">{muscle.function}</p>
      {top.length > 0 && (
        <ul className="mt-4 space-y-2">
          {top.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/exercises/${e.slug}`}
                className="glass-chip flex items-center gap-3 rounded-[1.25rem] p-2 pr-3 transition-transform duration-300 ease-spring active:scale-[0.97]"
              >
                <ExerciseThumb slug={e.slug} className="h-12 w-12 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.name}</span>
                <ChevronRight size={16} className="text-zinc-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/muscles/${id}`}
        className="mt-4 flex h-12 items-center justify-center rounded-full bg-amber-300 text-sm font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-300 ease-spring active:scale-95"
      >
        See {total} exercise{total === 1 ? "" : "s"}
      </Link>
    </div>
  );
}

/**
 * Rotatable 3D body. With a mouse: hover a muscle to name it, click to open its
 * page. On touch screens: tap a muscle to open a bottom sheet about it.
 */
export default function BodyExplorer({ highlights = {}, navigate = true, autoRotate = true, view = "front", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const router = useRouter();
  const [hover, setHover] = useState<MuscleId | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const [ready, setReady] = useState(false);
  const selectedRef = useRef<MuscleId | null>(null);
  const highlightKey = JSON.stringify(highlights);
  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let stage: Stage | undefined;
    let raf = 0;
    let disposed = false;
    let running = false;
    let onScreen = true;
    let first = true;
    let observer: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let hovered: MuscleId | null = null;
    let interacted = false;
    const cleanups: (() => void)[] = [];

    const loop = (now: number) => {
      if (!running || !stage) return;
      raf = requestAnimationFrame(loop);
      if (!interacted && stage.controls) stage.controls.autoRotate = autoRotate;
      stage.render(now / 1000);
      if (first) {
        first = false;
        setReady(true);
      }
    };
    // Only animate while on screen and the tab is visible.
    const sync = () => {
      const run = onScreen && !document.hidden && !!stage && !disposed;
      if (run && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!run && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    import("@/lib/three/stage").then(({ Stage }) => {
      if (disposed) return;
      const s = new Stage(canvas, { interactive: true });
      stage = s;
      stageRef.current = s;
      s.rig.setHighlights(JSON.parse(highlightKey));
      s.fit([A_POSE]);
      s.setPreset(view);
      s.pose(A_POSE);
      if (s.controls) {
        s.controls.autoRotate = autoRotate;
        s.controls.autoRotateSpeed = 1.2;
        s.controls.enableZoom = true;
      }
      // OrbitControls claims every touch; let vertical swipes scroll the page (horizontal drags
      // still rotate, and a two-finger pinch zooms the figure).
      canvas.style.touchAction = "pan-y";
      observer = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
      observer.observe(canvas);
      io = new IntersectionObserver(
        ([e]) => {
          onScreen = e.isIntersecting;
          sync();
        },
        { rootMargin: "120px" },
      );
      io.observe(canvas);
      document.addEventListener("visibilitychange", sync);
      cleanups.push(() => document.removeEventListener("visibilitychange", sync));

      const ndc = (ev: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((ev.clientX - r.left) / r.width) * 2 - 1, y: -((ev.clientY - r.top) / r.height) * 2 + 1, px: ev.clientX - r.left, py: ev.clientY - r.top };
      };
      const onMove = (ev: PointerEvent) => {
        // Touch drags rotate; naming muscles on hover is for mice and pens.
        if (ev.pointerType === "touch" || ev.buttons !== 0) return;
        const p = ndc(ev);
        const id = s.pick(p.x, p.y);
        if (id !== hovered) {
          hovered = id;
          s.rig.setHovered(id ?? selectedRef.current);
          canvas.style.cursor = id && navigate ? "pointer" : "grab";
          setHover(id);
        }
        // Follow the cursor without re-rendering.
        const tip = tipRef.current;
        if (tip) tip.style.transform = `translate(${p.px}px, ${p.py - 12}px) translate(-50%, -100%)`;
      };
      const onLeave = () => {
        hovered = null;
        s.rig.setHovered(selectedRef.current);
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
        if (!id || !navigate) return;
        if (ev.pointerType === "mouse") router.push(`/muscles/${id}`);
        else {
          selectedRef.current = id;
          s.rig.setHovered(id);
          setSelected(id);
          navigator.vibrate?.(8);
        }
      };
      canvas.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
      canvas.addEventListener("pointerdown", onDown, { passive: true });
      canvas.addEventListener("pointerup", onUp, { passive: true });
      cleanups.push(() => {
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerup", onUp);
      });
      sync();
    });

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      io?.disconnect();
      cleanups.forEach((c) => c());
      stage?.dispose();
      stageRef.current = null;
    };
  }, [highlightKey, navigate, autoRotate, view, router]);

  // Expanded view: real fullscreen where supported, a fixed overlay otherwise (iPhone).
  const toggleExpanded = async () => {
    const el = rootRef.current as FullscreenEl | null;
    if (!expanded) {
      setExpanded(true);
      if (!el) return;
      try {
        if (el.requestFullscreen && document.fullscreenEnabled) await el.requestFullscreen({ navigationUI: "hide" });
        else await el.webkitRequestFullscreen?.();
      } catch {
        // Fullscreen refused: the CSS overlay still covers the screen.
      }
    } else {
      setExpanded(false);
      const d = document as FullscreenDoc;
      if (fullscreenElement()) {
        if (d.exitFullscreen) d.exitFullscreen().catch(() => undefined);
        else d.webkitExitFullscreen?.();
      }
    }
  };

  useEffect(() => {
    const s = stageRef.current;
    const canvas = canvasRef.current;
    // Expanded: touch rotates and pinch-zooms the figure instead of scrolling the page.
    if (canvas) canvas.style.touchAction = expanded ? "none" : "pan-y";
    if (s?.controls) s.controls.enableZoom = true;
    if (!expanded) {
      // Collapsed: the mouse wheel scrolls the page instead of zooming (pinch still zooms).
      const el = rootRef.current;
      const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey) e.stopPropagation();
      };
      el?.addEventListener("wheel", onWheel, { capture: true });
      return () => el?.removeEventListener("wheel", onWheel, { capture: true });
    }
    const root = document.documentElement;
    root.classList.add("viewer-expanded");
    let wasFullscreen = false;
    const onFullscreenChange = () => {
      if (fullscreenElement()) wasFullscreen = true;
      else if (wasFullscreen) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("viewer-expanded");
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, ready]);

  // Leave fullscreen if the explorer unmounts while expanded.
  useEffect(() => {
    const el = rootRef.current;
    return () => {
      if (el && fullscreenElement() === el) (document as FullscreenDoc).exitFullscreen?.().catch(() => undefined);
    };
  }, []);

  const closeSheet = () => {
    selectedRef.current = null;
    stageRef.current?.rig.setHovered(null);
    setSelected(null);
  };

  return (
    <div
      ref={rootRef}
      className={
        expanded
          ? "fixed inset-0 z-[100] overflow-hidden bg-gradient-to-b from-white via-zinc-100 to-zinc-300 pt-safe pb-safe"
          : `relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white via-zinc-100 to-zinc-300 ${className ?? ""}`
      }
    >
      <canvas ref={canvasRef} className={`block h-full w-full ${expanded ? "touch-none" : "touch-pan-y"}`} aria-label="Interactive 3D muscle map" />
      <button
        type="button"
        onClick={toggleExpanded}
        aria-label={expanded ? "Exit full screen" : "Full screen"}
        className="glass-hud absolute right-3 z-20 grid h-11 w-11 place-items-center rounded-full text-white transition-transform duration-300 ease-spring active:scale-90"
        style={{ top: expanded ? "max(0.75rem, env(safe-area-inset-top))" : "0.75rem" }}
      >
        {expanded ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
      </button>
      {!ready && <div className="skeleton pointer-events-none absolute inset-0 opacity-60" />}
      <div
        ref={tipRef}
        className={`glass-hud pointer-events-none absolute left-0 top-0 z-10 rounded-xl px-3 py-1.5 text-center transition-opacity ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        {hover && (
          <>
            <div className="whitespace-nowrap text-sm font-bold text-white">{MUSCLES[hover].name}</div>
            <div className="whitespace-nowrap text-[11px] text-zinc-400">{MUSCLES[hover].latin}</div>
          </>
        )}
      </div>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-zinc-500">
        {"Drag to rotate · pinch to zoom · "}{navigate ? "tap a muscle to explore it" : "hover a muscle to name it"}
      </p>
      <BottomSheet open={selected !== null} onClose={closeSheet} label={selected ? MUSCLES[selected].name : "Muscle"}>
        {selected && <MuscleSheet id={selected} />}
      </BottomSheet>
    </div>
  );
}
