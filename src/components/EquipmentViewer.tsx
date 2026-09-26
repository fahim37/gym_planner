"use client";

import { useEffect, useRef, useState } from "react";
import type { EquipmentSlug } from "@/lib/equipment-catalog";
import type { EquipmentPart } from "@/lib/equipment-types";
import { useEquipmentFocus } from "./EquipmentFocus";
import { BEAD, GLASS_ACTIVE, GLASS_CHIP, GLASS_HUD, GLASS_STRONG, SPRING } from "./EquipmentGlass";
import type { EquipmentScene, MarkerState } from "./EquipmentScene";

interface Props {
  slug: EquipmentSlug;
  name: string;
  parts: EquipmentPart[];
  className?: string;
}

type Fullscreen = "native" | "css" | null;

const Icon = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
);
const ICONS = {
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  collapse: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  close: "M6 6l12 12M18 6L6 18",
  prev: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
};

const roundBtn = `glass-reactive pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${GLASS_HUD} ${SPRING} active:scale-90`;
const sheetBtn = `grid h-11 w-11 place-items-center rounded-full ${SPRING} hover:bg-white/10 active:scale-90`;

/**
 * Interactive 3D model of a piece of equipment: drag / pinch to orbit and
 * zoom, numbered hotspots that follow the model, tap a hotspot or part chip
 * to fly the camera to it and read what it does.
 */
export default function EquipmentViewer({ slug, name, parts, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EquipmentScene | null>(null);
  const markerEls = useRef(new Map<string, HTMLButtonElement>());
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const { focus, setFocus } = useEquipmentFocus();
  const setFocusRef = useRef(setFocus);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [hotspots, setHotspots] = useState<string[]>([]);
  const [hasDemo, setHasDemo] = useState(false);
  const [demo, setDemo] = useState(false);
  const [touched, setTouched] = useState(false);
  const [full, setFull] = useState<Fullscreen>(null);

  const activeIndex = parts.findIndex((p) => p.id === focus.id);
  const active = activeIndex >= 0 ? parts[activeIndex] : null;

  useEffect(() => {
    setFocusRef.current = setFocus;
  }, [setFocus]);

  // Scene + render loop. Marker positions are written straight to the DOM each frame.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const markers = markerEls.current;
    const states = new Map<string, MarkerState>();
    let scene: EquipmentScene | undefined;
    let raf = 0;
    let disposed = false;
    let onScreen = true;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let down: { x: number; y: number; t: number } | null = null;

    // A quick tap on the model (not a drag) selects the nearest part.
    const onDown = (e: PointerEvent) => {
      down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!scene || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 || performance.now() - start.t > 400) return;
      const r = canvas.getBoundingClientRect();
      const id = scene.pickPart(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (id) setFocusRef.current(id);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    const loop = (now: number) => {
      raf = 0;
      if (!scene || !onScreen) return; // Paused while scrolled away.
      scene.render(now);
      scene.project(states, now);
      for (const [id, m] of states) {
        const el = markers.get(id);
        if (!el) continue;
        el.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.visibility = m.visible ? "visible" : "hidden";
        el.style.zIndex = String(Math.max(1, 1000 - Math.round(m.depth * 40)));
        el.dataset.occluded = String(m.occluded);
      }
      raf = requestAnimationFrame(loop);
    };

    import("./EquipmentScene")
      .then(({ EquipmentScene }) => {
        if (disposed) return;
        const s = new EquipmentScene(canvas, slug);
        scene = s;
        sceneRef.current = s;
        s.onInteract = () => setTouched(true);
        setHotspots(s.hotspotIds);
        setHasDemo(s.hasDemo);
        setStatus("ready");
        resizeObserver = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
        resizeObserver.observe(canvas);
        visibilityObserver = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
          if (onScreen && !raf) raf = requestAnimationFrame(loop);
        });
        visibilityObserver.observe(canvas);
        raf = requestAnimationFrame(loop);
      })
      .catch(() => !disposed && setStatus("failed"));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [slug]);

  // Fly to the focused part (also when a part was picked before the model loaded).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !focus.id) return;
    scene.focus(focus.id);
    const root = rootRef.current;
    if (focus.source === "list" && root) {
      const r = root.getBoundingClientRect();
      if (r.top < 56 || r.bottom > window.innerHeight) root.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focus, status]);

  // Keep the active chip centred in the rail.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-part="${focus.id}"]`);
    if (rail && chip) rail.scrollTo({ left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [focus]);

  // Inline, vertical swipes scroll the page (horizontal drags still rotate); fullscreen captures every gesture.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && status === "ready") canvas.style.touchAction = full ? "none" : "pan-y";
  }, [full, status]);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull((f) => (f === "native" ? null : f));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // CSS fullscreen fallback (iPhone Safari has no element fullscreen): the shared
  // `viewer-expanded` class hides the app chrome and locks page scroll.
  useEffect(() => {
    if (full !== "css") return;
    const root = document.documentElement;
    root.classList.add("viewer-expanded");
    return () => root.classList.remove("viewer-expanded");
  }, [full]);

  const step = (delta: number) => {
    const i = activeIndex < 0 ? 0 : (activeIndex + delta + parts.length) % parts.length;
    setFocus(parts[i].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inside = full || rootRef.current?.contains(document.activeElement);
      if (e.key === "Escape") {
        if (focus.id) setFocus(null);
        else if (full === "css") setFull(null);
      } else if (inside && focus.id && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const i = parts.findIndex((p) => p.id === focus.id);
        const next = (i + (e.key === "ArrowRight" ? 1 : -1) + parts.length) % parts.length;
        setFocus(parts[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus.id, full, parts, setFocus]);

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    if (full === "native") {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (full === "css") {
      setFull(null);
      return;
    }
    if (document.fullscreenEnabled && el.requestFullscreen) {
      try {
        await el.requestFullscreen({ navigationUI: "hide" });
        setFull("native");
        return;
      } catch {
        // Fall through to the CSS version.
      }
    }
    setFull("css");
  };

  const toggleDemo = () => {
    const on = !demo;
    setDemo(on);
    // Step back to watch the whole motion, unless the user is looking at a part.
    sceneRef.current?.setDemo(on, !focus.id);
  };

  const resetView = () => {
    sceneRef.current?.reset();
    setFocus(null);
  };

  const onSheetUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 50) setFocus(null);
  };

  const hasHotspots = hotspots.length > 0;

  return (
    <div
      ref={rootRef}
      className={full ? "fixed inset-0 z-[60] flex flex-col bg-zinc-950 px-safe pt-safe" : `flex flex-col gap-3 ${className ?? ""}`}
    >
      <div
        className={`relative isolate overflow-hidden bg-gradient-to-b from-white to-zinc-200 ${
          full ? "min-h-0 flex-1" : "aspect-[4/5] rounded-[2rem] sm:aspect-[4/3] lg:aspect-square"
        }`}
      >
        {/* Specular glass rim around the 3D stage. */}
        {!full && (
          <div className="glass-border pointer-events-none absolute inset-0 z-30 rounded-[inherit]" />
        )}
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-label={`Interactive 3D model of the ${name}`} />

        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center" aria-label="Loading 3D model">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
          </div>
        )}
        {status === "failed" && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-600">
            The 3D model needs WebGL, which isn&apos;t available in this browser.
          </p>
        )}

        {/* Hotspot markers, positioned every frame by the render loop. */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {parts.map((p, i) =>
            hotspots.includes(p.id) ? (
              <button
                key={p.id}
                ref={(el) => {
                  if (!el) return;
                  markerEls.current.set(p.id, el);
                  return () => {
                    markerEls.current.delete(p.id);
                  };
                }}
                type="button"
                onClick={() => setFocus(p.id)}
                aria-label={`${i + 1}. ${p.label}`}
                aria-pressed={focus.id === p.id}
                style={{ visibility: "hidden" }}
                className="group pointer-events-auto absolute left-0 top-0 grid h-11 w-11 place-items-center transition-opacity duration-300 data-[occluded=true]:opacity-40"
              >
                {focus.id === p.id && <span className="absolute inset-1 animate-ping rounded-full bg-amber-300/50" />}
                <span
                  className={`relative grid h-8 w-8 place-items-center rounded-full text-sm font-black ${SPRING} group-active:scale-90 group-data-[occluded=true]:scale-75 ${
                    focus.id === p.id ? `scale-125 ${GLASS_ACTIVE}` : BEAD
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold group-hover:block ${GLASS_HUD}`}
                >
                  {p.label}
                </span>
              </button>
            ) : null,
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
          {hasDemo ? (
            <button
              type="button"
              role="switch"
              aria-checked={demo}
              onClick={toggleDemo}
              className={`pointer-events-auto flex h-11 items-center gap-2 rounded-full pl-2 pr-4 text-sm font-bold ${SPRING} active:scale-95 ${
                demo ? GLASS_ACTIVE : `glass-reactive ${GLASS_HUD}`
              }`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full ${SPRING} ${demo ? "rotate-90 bg-zinc-900 text-amber-300" : "bg-amber-300 text-zinc-900"}`}
              >
                {demo ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M7 4.5v15l13-7.5z" />
                  </svg>
                )}
              </span>
              {demo ? "Stop" : "See it in action"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col gap-2">
            <button type="button" onClick={toggleFullscreen} className={roundBtn} aria-label={full ? "Exit full screen" : "Full screen"}>
              <Icon d={full ? ICONS.collapse : ICONS.expand} />
            </button>
            <button type="button" onClick={resetView} className={roundBtn} aria-label="Reset view">
              <Icon d={ICONS.reset} />
            </button>
          </div>
        </div>

        {status === "ready" && !touched && !active && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center">
            <span className={`animate-rise inline-block rounded-full px-3 py-1.5 text-meta font-semibold ${GLASS_HUD}`}>
              Drag to spin · pinch to zoom{hasHotspots ? " · tap a part" : ""}
            </span>
          </p>
        )}

        {active && (
          <section
            aria-live="polite"
            aria-label={`${active.label} details`}
            onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={onSheetUp}
            onPointerCancel={() => (swipe.current = null)}
            className={`animate-sheet absolute inset-x-2 bottom-2 z-20 touch-none rounded-[1.75rem] px-4 pb-4 pt-2 ${GLASS_STRONG} sm:inset-x-3 sm:bottom-3`}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" aria-hidden />
            <div className="flex items-center gap-3">
              <span key={active.id} className={`animate-fade grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${GLASS_ACTIVE}`}>
                {activeIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-bold uppercase tracking-widest text-zinc-400">
                  Part {activeIndex + 1} of {parts.length}
                </p>
                <h3 key={active.id} className="animate-fade text-base font-bold leading-tight">
                  {active.label}
                </h3>
              </div>
              <div className="-mr-2 flex shrink-0">
                {parts.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} className={sheetBtn} aria-label="Previous part">
                      <Icon d={ICONS.prev} />
                    </button>
                    <button type="button" onClick={() => step(1)} className={sheetBtn} aria-label="Next part">
                      <Icon d={ICONS.next} />
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setFocus(null)} className={sheetBtn} aria-label="Close">
                  <Icon d={ICONS.close} />
                </button>
              </div>
            </div>
            <p key={active.id} className="animate-fade mt-2 text-md leading-relaxed text-zinc-200">
              {active.description}
            </p>
          </section>
        )}
      </div>

      {parts.length > 0 && (
        <div
          ref={railRef}
          className={`relative flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            full ? "scroll-px-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3" : "-mx-4 -my-1 scroll-px-4 px-4 py-1 sm:mx-0 sm:scroll-px-0 sm:px-0"
          }`}
          aria-label="Parts"
        >
          {parts.map((p, i) => {
            const on = focus.id === p.id;
            return (
              <button
                key={p.id}
                data-part={p.id}
                type="button"
                onClick={() => setFocus(p.id)}
                aria-pressed={on}
                className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold ${SPRING} active:scale-95 ${
                  on ? GLASS_ACTIVE : GLASS_CHIP
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${on ? "bg-zinc-900 text-amber-300" : BEAD}`}
                >
                  {i + 1}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
