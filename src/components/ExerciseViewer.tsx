"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Animation, CameraPreset } from "@/lib/anatomy/types";
import type { MuscleId } from "@/lib/muscles";
import type { Highlights } from "@/lib/three/rig";
import { PropSet } from "@/lib/three/props";
import type { Stage } from "@/lib/three/stage";

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
}

const SPEEDS = [0.5, 1, 1.5];

export default function ExerciseViewer({ animation, primary, secondary, bare, frame, className, hold }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [playing, setPlaying] = useState(frame === undefined);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<CameraPreset>(animation.camera ?? "front");
  const [cue, setCue] = useState<string | undefined>();
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [failed, setFailed] = useState(false);

  const timeline = useMemo(() => new Timeline(animation), [animation]);
  const highlights = useMemo<Highlights>(() => {
    const h: Highlights = {};
    for (const m of secondary) h[m] = "secondary";
    for (const m of primary) h[m] = "primary";
    return h;
  }, [primary, secondary]);

  // Playback state lives in refs so the render loop doesn't restart on every change.
  const playRef = useRef({ playing, speed, time: 0, elapsed: 0 });
  useEffect(() => {
    playRef.current.playing = playing;
    playRef.current.speed = speed;
  }, [playing, speed]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let stage: Stage;
    let props: PropSet;
    let raf = 0;
    let disposed = false;
    let observer: ResizeObserver | undefined;

    import("@/lib/three/stage")
      .then(({ Stage }) => {
        if (disposed) return;
        stage = new Stage(canvas, { interactive: !bare });
        stageRef.current = stage;
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

        let last = performance.now();
        let lastCue: string | undefined;
        let lastReps = -1;
        let lastSeconds = -1;
        const loop = (now: number) => {
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          const state = playRef.current;
          if (frame !== undefined && !state.playing) {
            stage.pose(timeline.keyframe(frame));
          } else {
            if (state.playing) {
              state.time += dt * state.speed;
              state.elapsed += dt;
            }
            const s = timeline.sample(state.time);
            const whole = Math.floor(state.elapsed);
            if (whole !== lastSeconds) setSeconds((lastSeconds = whole));
            stage.pose(s.pose);
            if (s.cue !== lastCue) setCue((lastCue = s.cue));
            if (s.reps !== lastReps) setReps((lastReps = s.reps));
          }
          props.update(stage.rig);
          stage.render(now / 1000);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      props?.dispose();
      stage?.dispose();
      stageRef.current = null;
    };
  }, [animation, timeline, highlights, bare, frame]);

  const changeView = (v: CameraPreset) => {
    setView(v);
    stageRef.current?.setPreset(v);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-white to-zinc-200 ${className ?? ""}`}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-label="3D exercise demonstration" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-600">
          3D preview needs WebGL, which isn&apos;t available in this browser.
        </p>
      )}
      {!bare && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
            {cue && (
              <span className="rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-semibold text-white">{cue}</span>
            )}
          </div>
          <div className="pointer-events-none absolute right-4 top-4 rounded-2xl bg-zinc-900/85 px-3 py-1.5 text-right text-white">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">{hold ? "Hold" : "Reps"}</div>
            <div className="text-xl font-black tabular-nums text-amber-300">{hold ? `${seconds}s` : reps}</div>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-zinc-900/85 p-1">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-white hover:bg-white/15"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${speed === s ? "bg-amber-300 text-zinc-900" : "text-white hover:bg-white/15"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full bg-zinc-900/85 p-1">
              {(["front", "side", "back"] as CameraPreset[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${view === v ? "bg-white text-zinc-900" : "text-white hover:bg-white/15"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
