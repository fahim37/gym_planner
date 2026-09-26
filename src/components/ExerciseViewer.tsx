"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Animation, CameraPreset } from "@/lib/anatomy/types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import type { Highlights } from "@/lib/three/rig";
import { PropSet } from "@/lib/three/props";
import type { Stage } from "@/lib/three/stage";
import { ChevronRight, CloseIcon, CollapseIcon, ExpandIcon, PauseIcon, PlayIcon } from "./icons";

interface Props {
  animation: Animation;
  primary: MuscleId[];
  secondary: MuscleId[];
  /** Hide the playback controls (e.g. inside the workout player). */
  bare?: boolean;
  /** Freeze on one keyframe instead of playing. */
  frame?: number;
  className?: string;
  /** Timed hold (plank): show elapsed seconds instead of a rep count. */
  hold?: boolean;
  /** Small overlay controls instead of the control strip under the figure (tight layouts such as the workout player). */
  compact?: boolean;
  /**
   * Drag to rotate the figure (default true). Turn it off when the viewer sits inside something
   * swipeable; rotating is always available in the expanded (fullscreen) view.
   */
  orbit?: boolean;
}

const SPEEDS = [0.25, 0.5, 1, 1.5];
const SPEED_LABEL: Record<number, string> = { 0.25: "¼×", 0.5: "½×", 1: "1×", 1.5: "1.5×" };
const VIEWS: CameraPreset[] = ["front", "side", "back"];
/** A pointer that moves less than this (px) and lifts quickly is a tap, not a rotate. */
const TAP_SLOP = 8;
const TAP_MS = 350;

type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

function fullscreenElement() {
  const d = document as FullscreenDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export default function ExerciseViewer({
  animation,
  primary,
  secondary,
  bare,
  frame,
  className,
  hold,
  compact,
  orbit = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [playing, setPlaying] = useState(frame === undefined);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<CameraPreset>(animation.camera ?? "front");
  const [cue, setCue] = useState<string | undefined>();
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hint, setHint] = useState(!bare && !compact);
  const [flash, setFlash] = useState({ n: 0, playing: true });
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const [picked, setPicked] = useState<MuscleId | null>(null);

  const timeline = useMemo(() => new Timeline(animation), [animation]);
  const highlights = useMemo<Highlights>(() => {
    const h: Highlights = {};
    for (const m of secondary) h[m] = "secondary";
    for (const m of primary) h[m] = "primary";
    return h;
  }, [primary, secondary]);

  // Playback state lives in refs so the render loop doesn't restart on every change.
  const playRef = useRef({ playing, speed, time: 0, elapsed: 0, scrubbing: false, frozen: frame !== undefined });
  useEffect(() => {
    playRef.current.playing = playing;
    playRef.current.speed = speed;
  }, [playing, speed]);

  // Muscle under the mouse (desktop hover), resolved once per frame in the render loop.
  const hoverRef = useRef({ x: 0, y: 0, dirty: false, active: false, id: null as MuscleId | null, picked: null as MuscleId | null });

  // Rotation: off while `orbit` is false, always on when expanded.
  const rotateRef = useRef(!bare && orbit);
  const canRotate = !bare && (orbit || expanded);
  useEffect(() => {
    rotateRef.current = canRotate;
    const controls = stageRef.current?.controls;
    if (controls) controls.enabled = canRotate;
  }, [canRotate]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let stage: Stage;
    let props: PropSet;
    let raf = 0;
    let disposed = false;
    let running = false;
    let onScreen = true;
    let last = 0;
    let observer: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    const hover = hoverRef.current;
    playRef.current.frozen = frame !== undefined && !playRef.current.playing;

    // The loop only runs while the canvas is on screen and the tab is visible.
    const start = () => {
      if (running || disposed || !stage) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (onScreen && !document.hidden ? start() : stop());

    let lastCue: string | undefined;
    let lastReps = -1;
    let lastSeconds = -1;
    let lastCycle = -1;
    let first = true;
    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      // rAF timestamps can precede the performance.now() taken when the loop (re)started: never step backwards.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const state = playRef.current;
      if (state.frozen && frame !== undefined) {
        stage.pose(timeline.keyframe(frame));
      } else {
        if (state.playing && !state.scrubbing) {
          state.time += dt * state.speed;
          state.elapsed += dt;
        }
        const s = timeline.sample(state.time);
        const whole = Math.floor(state.elapsed);
        if (whole !== lastSeconds) setSeconds((lastSeconds = whole));
        stage.pose(s.pose);
        if (s.cue !== lastCue) setCue((lastCue = s.cue));
        if (s.reps !== lastReps) setReps((lastReps = s.reps));
        // Position within the rep cycle drives the scrubber / progress line directly (no re-render).
        const cycle = Math.round(s.cycle * 1000);
        if (cycle !== lastCycle) {
          lastCycle = cycle;
          const scrub = scrubRef.current;
          if (scrub && !state.scrubbing) {
            scrub.valueAsNumber = cycle;
            scrub.style.setProperty("--p", `${cycle / 10}%`);
          }
          if (progressRef.current) progressRef.current.style.transform = `scaleX(${s.cycle})`;
        }
      }
      if (hover.dirty) {
        hover.dirty = false;
        const id = hover.active ? stage.pick(hover.x, hover.y) : null;
        if (id !== hover.id) {
          hover.id = id;
          stage.rig.setHovered(id ?? hover.picked);
          canvas.style.cursor = id ? "pointer" : "";
          setHovered(id);
        }
      }
      props.update(stage.rig);
      stage.render(now / 1000);
      if (first) {
        first = false;
        setReady(true);
      }
    };

    import("@/lib/three/stage")
      .then(({ Stage }) => {
        if (disposed) return;
        stage = new Stage(canvas, { interactive: !bare });
        stageRef.current = stage;
        if (stage.controls) stage.controls.enabled = rotateRef.current;
        stage.rig.setHighlights(highlights);
        props = new PropSet(animation.props ?? []);
        stage.scene.add(props.group);

        const poses = Array.from({ length: timeline.length }, (_, i) => timeline.keyframe(i));
        stage.fit(poses, props);
        props.update(stage.rig);
        stage.setPreset(animation.camera ?? "front");

        observer = new ResizeObserver(([entry]) => {
          stage.resize(entry.contentRect.width, entry.contentRect.height);
        });
        observer.observe(canvas);
        io = new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
            sync();
          },
          { rootMargin: "120px" },
        );
        io.observe(canvas);
        document.addEventListener("visibilitychange", sync);
        sync();
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", sync);
      observer?.disconnect();
      io?.disconnect();
      props?.dispose();
      stage?.dispose();
      stageRef.current = null;
      hover.id = null;
    };
  }, [animation, timeline, highlights, bare, frame]);

  // Hide the "drag to rotate" hint after a few seconds.
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(t);
  }, [hint]);

  const setPlay = useCallback((next: boolean, showFlash = false) => {
    const state = playRef.current;
    state.playing = next;
    if (next) state.frozen = false;
    setPlaying(next);
    if (showFlash) setFlash((f) => ({ n: f.n + 1, playing: next }));
  }, []);

  const pickedAt = useRef(0);
  const pick = (id: MuscleId | null) => {
    pickedAt.current = performance.now();
    const hover = hoverRef.current;
    hover.picked = id;
    stageRef.current?.rig.setHovered(hover.id ?? id);
    setPicked(id);
  };

  const changeView = (v: CameraPreset) => {
    setView(v);
    stageRef.current?.setPreset(v);
  };

  const cycleSpeed = () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);

  const toNdc = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, px: e.clientX - r.left, py: e.clientY - r.top };
  };

  // --- Tap a muscle to name it, tap anywhere else to play/pause; drags and pinches rotate. ---
  const tapRef = useRef<{ x: number; y: number; t: number; multi: boolean; pointers: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    setHint(false);
    const tap = tapRef.current;
    if (tap && tap.pointers > 0) {
      tap.pointers++;
      tap.multi = true;
      return;
    }
    tapRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, multi: false, pointers: 1 };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const tap = tapRef.current;
    if (!tap) return;
    tap.pointers = Math.max(0, tap.pointers - 1);
    if (tap.pointers > 0) return;
    tapRef.current = null;
    const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP;
    if (tap.multi || moved || e.timeStamp - tap.t > TAP_MS || e.button !== 0) return;
    const p = toNdc(e);
    const id = stageRef.current?.pick(p.x, p.y) ?? null;
    if (id) pick(id === picked ? null : id);
    else if (picked) pick(null);
    else setPlay(!playRef.current.playing, true);
  };
  const onPointerCancel = () => (tapRef.current = null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const hover = hoverRef.current;
    const p = toNdc(e);
    hover.x = p.x;
    hover.y = p.y;
    hover.active = e.buttons === 0;
    hover.dirty = true;
    const tip = tipRef.current;
    if (tip) tip.style.transform = `translate(${p.px}px, ${p.py - 14}px) translate(-50%, -100%)`;
  };
  const onPointerLeave = () => {
    const hover = hoverRef.current;
    hover.active = false;
    hover.dirty = true;
  };

  // --- Scrubber: dragging seeks within the rep cycle and pauses. ---
  const seek = (value: number) => {
    const state = playRef.current;
    const base = Math.floor(state.time / timeline.duration) * timeline.duration;
    state.time = base + Math.min(0.999, value / 1000) * timeline.duration;
    state.frozen = false;
    scrubRef.current?.style.setProperty("--p", `${value / 10}%`);
    if (state.playing) setPlay(false);
  };

  // --- Expanded view: real fullscreen where supported, a fixed overlay otherwise (iPhone). ---
  const toggleExpanded = async () => {
    const el = rootRef.current as FullscreenEl | null;
    if (!expanded) {
      setExpanded(true);
      setHint(true);
      if (!el) return;
      try {
        if (el.requestFullscreen && document.fullscreenEnabled) await el.requestFullscreen({ navigationUI: "hide" });
        else await el.webkitRequestFullscreen?.();
      } catch {
        // Fullscreen refused: the CSS overlay still gives a full-screen view.
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
    if (!expanded) return;
    const root = document.documentElement;
    root.classList.add("viewer-expanded");
    let wasFullscreen = false;
    const onFullscreenChange = () => {
      if (fullscreenElement()) wasFullscreen = true;
      else if (wasFullscreen) setExpanded(false); // Left fullscreen with Esc / system back.
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
  }, [expanded]);

  // Leave fullscreen if the viewer unmounts while expanded (e.g. navigating away).
  useEffect(() => {
    const el = rootRef.current;
    return () => {
      if (el && fullscreenElement() === el) (document as FullscreenDoc).exitFullscreen?.().catch(() => undefined);
    };
  }, []);

  const showStrip = !bare && !compact && !failed;
  const stage = "bg-gradient-to-b from-white via-zinc-100 to-zinc-300";
  const rootClass = expanded
    ? `fixed inset-0 z-[100] flex flex-col px-safe pt-safe pb-safe ${stage}`
    : `relative flex flex-col overflow-hidden rounded-[1.75rem] ${stage} ${className ?? ""}`;
  const pickedRole = picked ? (primary.includes(picked) ? "primary" : secondary.includes(picked) ? "secondary" : "none") : null;

  const viewButtons = (size: "sm" | "md") => (
    <div className="glass-hud flex rounded-full p-1" role="group" aria-label="Camera angle">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => changeView(v)}
          aria-pressed={view === v}
          className={`hit rounded-full font-semibold capitalize transition-transform duration-300 ease-spring active:scale-90 ${
            size === "sm" ? "h-10 px-3 text-xs" : "h-11 px-4 text-sm"
          } ${view === v ? "bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.3)]" : "text-white hover:bg-white/10"}`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className={rootClass}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={bare ? undefined : onPointerDown}
          onPointerUp={bare ? undefined : onPointerUp}
          onPointerCancel={bare ? undefined : onPointerCancel}
          onPointerMove={bare ? undefined : onPointerMove}
          onPointerLeave={bare ? undefined : onPointerLeave}
          className={`absolute inset-0 block h-full w-full ${canRotate ? "touch-none" : "touch-pan-y"} ${
            canRotate ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          aria-label="3D exercise demonstration. Tap a muscle to name it, tap elsewhere to pause."
        />
        {!ready && !failed && <div className="skeleton pointer-events-none absolute inset-0 opacity-60" />}
        {failed && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-600">
            3D preview needs WebGL, which isn&apos;t available in this browser.
          </p>
        )}
        {!bare && (
          <>
            <div className="pointer-events-none absolute left-3 right-24 top-3 flex flex-col items-start gap-1">
              {cue && (
                <span key={cue} className="glass-hud animate-fade rounded-full px-3 py-1.5 text-meta font-semibold">
                  {cue}
                </span>
              )}
              {!playing && ready && (
                <span className="animate-fade rounded-full bg-amber-300 px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_4px_12px_-2px_rgba(0,0,0,.25)]">
                  Paused
                </span>
              )}
            </div>
            <div className="glass-hud pointer-events-none absolute right-3 top-3 rounded-[1.1rem] px-3 py-1.5 text-right">
              <div className="text-2xs font-semibold uppercase tracking-wider text-zinc-300">{hold ? "Hold" : "Reps"}</div>
              <div className="text-xl font-black tabular-nums text-amber-300">{hold ? `${seconds}s` : reps}</div>
            </div>
            <div
              ref={tipRef}
              className={`glass-hud pointer-events-none absolute left-0 top-0 z-10 rounded-xl px-3 py-1.5 text-center transition-opacity ${
                hovered && hovered !== picked ? "opacity-100" : "opacity-0"
              }`}
            >
              {hovered && (
                <>
                  <div className="whitespace-nowrap text-sm font-bold text-white">{MUSCLES[hovered].name}</div>
                  <div className="whitespace-nowrap text-xs text-zinc-300">
                    {primary.includes(hovered) ? "Target" : secondary.includes(hovered) ? "Also working" : "Click for details"}
                  </div>
                </>
              )}
            </div>
            {flash.n > 0 && (
              <div
                key={flash.n}
                className="glass-hud animate-pop pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-8 grid h-16 w-16 place-items-center rounded-full"
              >
                {flash.playing ? <PlayIcon size={28} /> : <PauseIcon size={28} />}
              </div>
            )}
            {hint && ready && !picked && (
              <div
                className="animate-fade pointer-events-none absolute inset-x-0 bottom-16 flex justify-center"
              >
                <span className="glass-hud rounded-full px-3 py-1.5 text-xs font-semibold">
                  {canRotate ? "Drag to rotate · tap a muscle" : "Tap a muscle · tap to pause"}
                </span>
              </div>
            )}
            {picked && (
              <div
                key={picked}
                className="glass-hud animate-rise absolute inset-x-3 bottom-16 z-10 mx-auto flex max-w-sm items-center gap-2 rounded-[1.4rem] p-1.5 pl-3.5"
              >
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    pickedRole === "primary" ? "bg-red-600" : pickedRole === "secondary" ? "bg-orange-300" : "bg-zinc-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{MUSCLES[picked].name}</div>
                  <div className="truncate text-xs text-zinc-300">
                    {pickedRole === "primary" ? "Target muscle" : pickedRole === "secondary" ? "Also working" : "Not worked in this move"}
                  </div>
                </div>
                <Link
                  href={`/muscles/${picked}`}
                  // Ignore the synthetic click from the same tap that opened the chip.
                  onClick={(e) => performance.now() - pickedAt.current < 400 && e.preventDefault()}
                  className="glass-chip flex h-11 shrink-0 items-center gap-0.5 rounded-full pl-3.5 pr-2 text-xs font-bold text-amber-300 transition-transform duration-300 ease-spring active:scale-90"
                >
                  Exercises
                  <ChevronRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => performance.now() - pickedAt.current > 400 && pick(null)}
                  aria-label="Close"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-300 hover:text-white"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            )}
          </>
        )}
        {!bare && !failed && (
          <>
            {compact && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-900/10">
                <div ref={progressRef} className="h-full origin-left bg-amber-400" style={{ transform: "scaleX(0)" }} />
              </div>
            )}
            <div className="absolute bottom-3 left-3">{viewButtons("sm")}</div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              {compact && (
                <button
                  type="button"
                  onClick={() => setPlay(!playing)}
                  aria-label={playing ? "Pause" : "Play"}
                  className="glass-hud grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 ease-spring active:scale-90"
                >
                  {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                </button>
              )}
              <button
                type="button"
                onClick={toggleExpanded}
                aria-label={expanded ? "Exit full screen" : "Full screen"}
                className="glass-hud grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 ease-spring active:scale-90"
              >
                {expanded ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
              </button>
            </div>
          </>
        )}
      </div>

      {showStrip && (
        <div className="relative z-10 px-2.5 pb-2.5 pt-1">
          <div className="glass-hud mx-auto flex max-w-xl items-center gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => setPlay(!playing)}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(180,83,9,0.25),0_4px_12px_-4px_rgba(252,211,77,0.7)] transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-90"
            >
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>
            <input
              ref={scrubRef}
              type="range"
              min={0}
              max={1000}
              step={1}
              defaultValue={0}
              aria-label="Position in the rep"
              className="scrubber min-w-0 flex-1 px-1.5"
              onPointerDown={() => {
                playRef.current.scrubbing = true;
                if (playRef.current.playing) setPlay(false);
              }}
              onPointerUp={() => (playRef.current.scrubbing = false)}
              onPointerCancel={() => (playRef.current.scrubbing = false)}
              onBlur={() => (playRef.current.scrubbing = false)}
              onInput={(e) => seek(Number(e.currentTarget.value))}
            />
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed}×, tap to change`}
              className={`h-11 min-w-13 shrink-0 rounded-full px-2 text-sm font-black tabular-nums transition-transform duration-300 ease-spring active:scale-90 ${
                speed === 1 ? "text-white hover:bg-white/10" : "glass-chip text-amber-300"
              }`}
            >
              {SPEED_LABEL[speed]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
