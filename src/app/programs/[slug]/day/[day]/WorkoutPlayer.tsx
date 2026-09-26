"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import ExerciseThumb from "@/components/ExerciseThumb";
import ExerciseViewer from "@/components/ExerciseViewer";
import { CheckIcon, ChevronLeft, ChevronRight, CloseIcon, SoundOffIcon, SoundOnIcon, SwipeIcon } from "@/components/icons";
import { getExercise } from "@/data/exercises";
import type { Program, ProgramExercise } from "@/data/programs";
import { MUSCLES } from "@/lib/muscles";
import { useProgress } from "@/lib/progress";
import { useWakeLock } from "@/lib/wake-lock";
import { buzz, go as restOver, tick, unlockAudio, useSoundPref } from "@/lib/workout-feedback";

type Phase = { kind: "work" } | { kind: "rest"; until: number; total: number } | { kind: "done"; seconds: number };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const repsLabel = (reps: string) => `${reps}${/\d$/.test(reps) ? " reps" : ""}`;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** Workout clock. Driven by requestAnimationFrame; only touches the DOM when the second changes. */
function Elapsed({ since }: { since: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const s = Math.floor((Date.now() - since) / 1000);
      if (s !== last && ref.current) ref.current.textContent = fmt((last = s));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [since]);
  return (
    <span ref={ref} className="tabular-nums">
      0:00
    </span>
  );
}

const RING_R = 50;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Rest countdown. The ring and number are updated every frame through refs (no re-renders);
 * the last 3 seconds tick (beep + buzz) and the end signals "go".
 */
function RestPanel({
  until,
  total,
  sound,
  onDone,
  onAdd,
  upNext,
}: {
  until: number;
  total: number;
  sound: boolean;
  onDone: () => void;
  onAdd: () => void;
  upNext: { item: ProgramExercise; set: number } | null;
}) {
  const ringRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const latest = useRef({ onDone, sound });
  useEffect(() => {
    latest.current = { onDone, sound };
  });
  const [initial] = useState(total);

  useEffect(() => {
    let raf = 0;
    let finished = false;
    let lastSec = -1;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (latest.current.sound) restOver();
      else buzz([120, 60, 120]);
      latest.current.onDone();
    };
    const loop = () => {
      const left = until - Date.now();
      const frac = Math.min(1, Math.max(0, left / (total * 1000)));
      ringRef.current?.setAttribute("stroke-dashoffset", String(RING_C * (1 - frac)));
      const sec = Math.max(0, Math.ceil(left / 1000));
      if (sec !== lastSec) {
        const first = lastSec === -1;
        lastSec = sec;
        if (numRef.current) numRef.current.textContent = sec >= 60 ? fmt(sec) : String(sec);
        if (!first && sec > 0 && sec <= 3) {
          if (latest.current.sound) tick();
          else buzz(40);
        }
      }
      if (left <= 0) return finish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Safety net: still end the rest if frames are paused (tab in the background).
    const timeout = setTimeout(finish, Math.max(0, until - Date.now()) + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [until, total]);

  const next = upNext && getExercise(upNext.item.slug)!;

  return (
    <div className="animate-rise">
      <div className="flex items-center gap-4">
        <div className="relative grid shrink-0 place-items-center">
          <svg width="116" height="116" viewBox="0 0 116 116" className="-rotate-90">
            <circle cx="58" cy="58" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
            <circle
              ref={ringRef}
              cx="58"
              cy="58"
              r={RING_R}
              fill="none"
              stroke="#fcd34d"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={0}
            />
          </svg>
          <div className="absolute text-center">
            <span ref={numRef} className={`block font-black tabular-nums leading-none ${initial >= 60 ? "text-3xl" : "text-4xl"}`}>
              {initial >= 60 ? fmt(initial) : initial}
            </span>
            <span className="text-2xs font-bold uppercase tracking-[0.16em] text-zinc-400">Rest</span>
          </div>
        </div>
        {next && upNext ? (
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-amber-300">Up next</p>
            <div className="glass-chip mt-2 flex items-center gap-3 rounded-[1.25rem] p-2">
              <ExerciseThumb slug={next.slug} eager className="h-14 w-14 shrink-0 rounded-[0.9rem]" />
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-bold leading-snug">{next.name}</div>
                <div className="mt-0.5 text-xs font-extrabold uppercase text-zinc-300">
                  Set {upNext.set} of {upNext.item.sets} · {repsLabel(upNext.item.reps)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-md text-zinc-300">Last set coming up. Finish strong.</p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="glass-chip h-14 rounded-full px-6 text-base font-bold transition-transform duration-300 ease-spring hover:bg-white/10 active:scale-90"
        >
          +15 s
        </button>
        <button
          type="button"
          onClick={onDone}
          className="glass-reactive h-14 overflow-hidden rounded-full bg-amber-300 text-base font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_-10px_rgba(252,211,77,0.7)] transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-95"
        >
          Skip rest
        </button>
      </div>
    </div>
  );
}

/** One exercise in the swipeable deck: the live 3D viewer for the current one, a still for its neighbours. */
function Slide({ item, live, onPrev, onNext }: { item?: ProgramExercise; live: boolean; onPrev?: () => void; onNext?: () => void }) {
  if (!item) return <div className="h-full w-full shrink-0" />;
  const exercise = getExercise(item.slug)!;
  const Title = live ? "h1" : "p";
  return (
    <div className="flex h-full w-full shrink-0 flex-col px-2" aria-hidden={live ? undefined : true}>
      <div className="relative min-h-0 flex-1">
        {live ? (
          <ExerciseViewer
            key={exercise.slug}
            animation={exercise.animation}
            primary={exercise.primary}
            secondary={exercise.secondary}
            hold={exercise.hold}
            compact
            orbit={false}
            className="h-full w-full rounded-[1.75rem]"
          />
        ) : (
          <ExerciseThumb slug={exercise.slug} eager className="h-full w-full rounded-[1.75rem] [&_img]:scale-110" />
        )}
      </div>
      <div className="flex items-center gap-1 pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          aria-label="Previous exercise"
          className="glass-chip grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90 disabled:opacity-0"
        >
          <ChevronLeft size={22} />
        </button>
        <Link href={`/exercises/${exercise.slug}`} className="min-w-0 flex-1 text-center">
          <Title className="truncate text-xl font-bold sm:text-2xl">{exercise.name}</Title>
          <p className="truncate text-meta text-zinc-400">
            {exercise.primary.map((m) => MUSCLES[m].name).join(" · ")} · <span className="font-semibold text-amber-300">How to ›</span>
          </p>
        </Link>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next exercise"
          className="glass-chip grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90 disabled:opacity-0"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutPlayer({ program, day }: { program: Program; day: number }) {
  const plan = program.days[day - 1];
  const items = plan.exercises;
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase>({ kind: "work" });
  const [startedAt] = useState(() => Date.now());
  const [hint, setHint] = useState(true);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sound, toggleSound] = useSoundPref();
  const { markDone } = useProgress(program.slug);
  const screenOn = useWakeLock(phase.kind !== "done");

  const deckRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null; dx: number; lastX: number; lastT: number; v: number } | null>(
    null,
  );

  const item = items[index];
  const totalSets = items.reduce((n, x) => n + x.sets, 0);
  const setsDone = items.slice(0, index).reduce((n, x) => n + x.sets, 0) + set - 1;
  const nextItem = items[index + 1];
  const upNext = set < item.sets ? { item, set: set + 1 } : nextItem ? { item: nextItem, set: 1 } : null;

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const jump = useCallback((to: number) => {
    setIndex(to);
    setSet(1);
    setPhase({ kind: "work" });
  }, []);

  // After the index changes, drop the offset: the middle slide now shows the new exercise.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "";
    animating.current = false;
  }, [index]);

  /** Animate the deck one slide over, then switch exercise. */
  const slideTo = useCallback(
    (dir: 1 | -1) => {
      const target = index + dir;
      const track = trackRef.current;
      if (!track || animating.current || target < 0 || target >= items.length) return;
      animating.current = true;
      setHint(false);
      buzz(8);
      track.style.transition = `transform 320ms ${EASE}`;
      track.style.transform = `translate3d(${-dir * 100}%, 0, 0)`;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        track.removeEventListener("transitionend", onEnd);
        jump(target);
      };
      const onEnd = (e: TransitionEvent) => e.target === track && finish();
      track.addEventListener("transitionend", onEnd);
      setTimeout(finish, 420); // In case transitionend never fires.
    },
    [index, items.length, jump],
  );

  // Arrow keys on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.key === "ArrowRight") slideTo(1);
      else if (e.key === "ArrowLeft") slideTo(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slideTo]);

  // --- Swipe: the track follows the finger 1:1, then settles or flips to the neighbour. ---
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animating.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, dx: 0, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const track = trackRef.current;
    if (!d || d.id !== e.pointerId || !track) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        d.axis = "x";
        e.currentTarget.setPointerCapture(e.pointerId);
        track.style.transition = "none";
        if (hint) setHint(false);
      } else if (Math.abs(dy) > 8) d.axis = "y";
    }
    if (d.axis !== "x") return;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === items.length - 1);
    d.dx = atEdge ? dx * 0.3 : dx;
    track.style.transform = `translate3d(${d.dx}px, 0, 0)`;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const track = trackRef.current;
    if (!d || d.id !== e.pointerId || d.axis !== "x" || !track) return;
    const width = deckRef.current?.clientWidth ?? 360;
    if ((d.dx < -width * 0.22 || d.v < -0.45) && index < items.length - 1) slideTo(1);
    else if ((d.dx > width * 0.22 || d.v > 0.45) && index > 0) slideTo(-1);
    else {
      track.style.transition = `transform 260ms ${EASE}`;
      track.style.transform = "none";
    }
  };

  const advance = () => {
    if (set < item.sets) {
      setSet(set + 1);
      setPhase({ kind: "work" });
    } else if (nextItem) slideTo(1);
    else setPhase({ kind: "work" });
  };

  const completeSet = () => {
    unlockAudio(); // Tap = user gesture, so the rest countdown may beep.
    const last = set === item.sets && !nextItem;
    if (last) {
      markDone(day);
      buzz([60, 40, 60, 40, 160]);
      setPhase({ kind: "done", seconds: Math.round((Date.now() - startedAt) / 1000) });
    } else {
      buzz(15);
      setPhase({ kind: "rest", until: Date.now() + item.rest * 1000, total: item.rest });
    }
  };

  if (phase.kind === "done") {
    return (
      <div
        data-focus-route
        className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 pb-safe pt-safe text-center md:min-h-0 md:py-20"
      >
        <div className="animate-rise text-7xl">🏆</div>
        <h1 className="display animate-rise mt-4 text-5xl [animation-delay:80ms]">Workout complete</h1>
        <p className="animate-rise mt-3 text-zinc-300 [animation-delay:140ms]">
          {program.name} · {plan.title}. Great work.
        </p>
        <div className="animate-rise mt-8 grid w-full grid-cols-3 gap-2 [animation-delay:200ms]">
          {[
            { label: "Time", value: fmt(phase.seconds) },
            { label: "Sets", value: totalSets },
            { label: "Exercises", value: items.length },
          ].map((s) => (
            <div key={s.label} className="surface rounded-[1.25rem] p-3">
              <div className="text-2xl font-black tabular-nums text-amber-300">{s.value}</div>
              <div className="text-2xs font-bold uppercase tracking-widest text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="animate-rise mt-8 flex w-full flex-col gap-3 [animation-delay:260ms]">
          <Link
            href={`/programs/${program.slug}`}
            className="glass-reactive flex h-14 items-center justify-center overflow-hidden rounded-full bg-amber-300 font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-transform duration-300 ease-spring active:scale-95"
          >
            Back to program
          </Link>
          {day < program.days.length && (
            <Link
              href={`/programs/${program.slug}/day/${day + 1}`}
              className="glass flex h-14 items-center justify-center rounded-full font-bold transition-transform duration-300 ease-spring active:scale-95"
            >
              Preview {program.days[day].title}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const exitHref = `/programs/${program.slug}`;

  return (
    <div
      data-focus-route
      className="mx-auto flex h-[100dvh] w-full max-w-xl flex-col overscroll-none pt-safe md:h-[calc(100dvh-var(--header-offset))] md:py-3"
    >
      {/* Top bar */}
      <div className="flex h-13 shrink-0 items-center gap-1 px-2">
        {setsDone > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            aria-label="End workout"
            className="glass-chip grid h-11 w-11 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90"
          >
            <CloseIcon size={20} />
          </button>
        ) : (
          <Link
            href={exitHref}
            aria-label="Exit workout"
            className="glass-chip grid h-11 w-11 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90"
          >
            <CloseIcon size={20} />
          </Link>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold">
            {plan.title} · Exercise {index + 1}/{items.length}
          </p>
          <p className="text-xs text-zinc-400">
            <Elapsed since={startedAt} />
            {screenOn && <span className="ml-1.5 text-emerald-300/80">· screen stays on</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={sound ? "Mute beeps" : "Turn beeps on"}
          aria-pressed={sound}
          className="glass-chip grid h-11 w-11 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90"
        >
          {sound ? <SoundOnIcon size={20} /> : <SoundOffIcon size={20} />}
        </button>
      </div>

      {/* Progress: one segment per exercise, filled by sets done. */}
      <div className="flex shrink-0 gap-1 px-4 pb-3" aria-label={`${setsDone} of ${totalSets} sets done`}>
        {items.map((x, i) => {
          const filled = i < index ? 1 : i === index ? (set - 1) / x.sets : 0;
          return (
            <div key={i} className={`h-1.5 flex-1 overflow-hidden rounded-full ${i === index ? "bg-white/20" : "bg-white/10"}`}>
              <div
                className="h-full origin-left bg-amber-300 transition-transform duration-500"
                style={{ transform: `scaleX(${filled})` }}
              />
            </div>
          );
        })}
      </div>

      {/* Swipeable deck of exercises */}
      <div
        ref={deckRef}
        className="relative min-h-0 flex-1 touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* At rest the track is offset with a margin, not a transform: a transformed ancestor would trap the
            viewer's fixed-position full-screen fallback (iPhone) inside the deck. */}
        <div ref={trackRef} className="-ml-[100%] flex h-full w-full">
          <Slide key="prev" item={items[index - 1]} live={false} />
          <Slide
            key="current"
            item={item}
            live
            onPrev={index > 0 ? () => slideTo(-1) : undefined}
            onNext={nextItem ? () => slideTo(1) : undefined}
          />
          <Slide key="next" item={nextItem} live={false} />
        </div>
        {hint && items.length > 1 && (
          <div className="animate-fade pointer-events-none absolute inset-x-0 top-16 flex justify-center">
            <span className="glass-hud flex items-center gap-2 rounded-full px-3.5 py-2 text-meta font-semibold">
              <SwipeIcon size={18} className="animate-nudge" /> Swipe to switch exercise
            </span>
          </div>
        )}
      </div>

      {/* Set / rest panel */}
      <div className="glass mx-2 mb-[max(0.5rem,var(--safe-bottom))] mt-2 min-h-[13.5rem] shrink-0 rounded-[2rem] p-4">
        {phase.kind === "rest" ? (
          <RestPanel
            key={`${index}-${set}`}
            until={phase.until}
            total={phase.total}
            sound={sound}
            onDone={advance}
            onAdd={() => setPhase({ kind: "rest", until: phase.until + 15000, total: phase.total + 15 })}
            upNext={upNext}
          />
        ) : (
          <div key={`${index}-${set}`} className="animate-rise">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-zinc-300">
                  Set {set} of {item.sets}
                </p>
                <p
                  className={`display mt-1 truncate not-italic text-amber-300 ${
                    repsLabel(item.reps).length <= 8 ? "text-[2.5rem]" : repsLabel(item.reps).length <= 12 ? "text-[1.85rem]" : "text-2xl"
                  }`}
                >
                  {repsLabel(item.reps)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5 pb-2">
                {Array.from({ length: item.sets }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-6 rounded-full ${i < set - 1 ? "bg-emerald-400" : i === set - 1 ? "bg-white" : "bg-white/15"}`}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={completeSet}
              data-haptic="success"
              className="glass-reactive mt-4 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-amber-300 text-lg font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_-10px_rgba(252,211,77,0.75)] transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-95"
            >
              {set === item.sets && !nextItem ? "Finish workout" : "Set done"}
              <CheckIcon size={22} strokeWidth={3} />
            </button>
            <p className="mt-2.5 truncate text-center text-meta text-zinc-400">
              {upNext
                ? `Then ${item.rest}s rest · next: ${upNext.item === item ? `set ${upNext.set}` : getExercise(upNext.item.slug)!.name}`
                : "Last set of the workout"}
            </p>
          </div>
        )}
      </div>

      <BottomSheet open={confirmExit} onClose={() => setConfirmExit(false)} label="End workout?">
        {(close) => (
          <div className="pb-2 text-center">
            <h2 className="display text-3xl">End workout?</h2>
            <p className="mt-2 text-md text-zinc-300">
              You&apos;ve done {setsDone} of {totalSets} sets. This session won&apos;t be marked complete.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={close}
                className="h-14 rounded-full bg-amber-300 font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-transform duration-300 ease-spring active:scale-95"
              >
                Keep going
              </button>
              <Link
                href={exitHref}
                className="glass-chip flex h-14 items-center justify-center rounded-full font-bold text-red-300 transition-transform duration-300 ease-spring active:scale-95"
              >
                End workout
              </Link>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
