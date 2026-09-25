"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ExerciseViewer from "@/components/ExerciseViewer";
import { getExercise } from "@/data/exercises";
import type { Program } from "@/data/programs";
import { MUSCLES } from "@/lib/muscles";
import { useProgress } from "@/lib/progress";

type Phase = { kind: "work" } | { kind: "rest"; until: number } | { kind: "done" };

function RestTimer({ until, total, onDone, onAdd }: { until: number; total: number; onDone: () => void; onAdd: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);
  const r = 54;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, left / total);
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Rest</p>
      <div className="relative grid place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#fcd34d"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            className="transition-[stroke-dashoffset] duration-200"
          />
        </svg>
        <span className="absolute text-4xl font-black tabular-nums">{left}s</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onAdd} className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold hover:bg-zinc-700">
          +15 s
        </button>
        <button type="button" onClick={onDone} className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-zinc-900 hover:bg-amber-200">
          Skip rest
        </button>
      </div>
    </div>
  );
}

export default function WorkoutPlayer({ program, day }: { program: Program; day: number }) {
  const plan = program.days[day - 1];
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase>({ kind: "work" });
  const { markDone } = useProgress(program.slug);

  const item = plan.exercises[index];
  const exercise = getExercise(item.slug)!;
  const totalSets = plan.exercises.reduce((n, x) => n + x.sets, 0);
  const setsDone = plan.exercises.slice(0, index).reduce((n, x) => n + x.sets, 0) + set - 1;
  const nextItem = plan.exercises[index + 1];

  const advance = () => {
    if (set < item.sets) setSet(set + 1);
    else if (nextItem) {
      setIndex(index + 1);
      setSet(1);
    }
    setPhase({ kind: "work" });
  };

  const completeSet = () => {
    const last = set === item.sets && !nextItem;
    if (last) {
      markDone(day);
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "rest", until: Date.now() + item.rest * 1000 });
    }
  };

  const jump = (to: number) => {
    setIndex(to);
    setSet(1);
    setPhase({ kind: "work" });
  };

  if (phase.kind === "done") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="display mt-4 text-5xl">Workout complete</h1>
        <p className="mt-3 text-zinc-300">
          {program.name} · {plan.title} — {totalSets} sets across {plan.exercises.length} exercises. Great work.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/programs/${program.slug}`} className="rounded-full bg-amber-300 px-6 py-3 font-bold text-zinc-900">
            Back to program
          </Link>
          {day < program.days.length && (
            <Link href={`/programs/${program.slug}/day/${day + 1}`} className="rounded-full border border-white/20 px-6 py-3 font-bold">
              Preview {program.days[day].title}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-5">
      <div className="mb-3 flex items-center justify-between text-sm">
        <Link href={`/programs/${program.slug}`} className="font-semibold text-zinc-400 hover:text-white">
          ✕ Exit
        </Link>
        <span className="font-semibold text-zinc-400">
          Exercise {index + 1}/{plan.exercises.length}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-amber-300 transition-all" style={{ width: `${(setsDone / totalSets) * 100}%` }} />
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-zinc-800 shadow-2xl shadow-black/50">
        <ExerciseViewer
          key={exercise.slug}
          animation={exercise.animation}
          primary={exercise.primary}
          secondary={exercise.secondary}
          hold={exercise.hold}
          className="aspect-square w-full rounded-[2rem]"
        />
        <div className="px-5 pb-6 pt-4 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{exercise.name}</h1>
          <div className="mt-1 text-xs text-zinc-400">{exercise.primary.map((m) => MUSCLES[m].name).join(" · ")}</div>

          {phase.kind === "rest" ? (
            <RestTimer
              key={`${index}-${set}`}
              until={phase.until}
              total={item.rest}
              onDone={advance}
              onAdd={() => setPhase({ kind: "rest", until: phase.until + 15000 })}
            />
          ) : (
            <>
              <div className="display mt-4 text-5xl not-italic text-amber-300">
                {item.reps} {/\d$/.test(item.reps) ? "reps" : ""}
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {Array.from({ length: item.sets }, (_, i) => (
                  <span key={i} className={`h-2.5 w-8 rounded-full ${i < set - 1 ? "bg-emerald-400" : i === set - 1 ? "bg-white" : "bg-zinc-600"}`} />
                ))}
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-300">
                Set {set} of {item.sets}
              </div>
              <div className="mt-4 inline-block rounded-full bg-white px-6 py-1.5 text-2xl font-black text-zinc-900">
                {plan.title.toUpperCase()}
              </div>
              <button
                type="button"
                onClick={completeSet}
                className="mt-6 block w-full rounded-full bg-amber-300 py-4 text-lg font-black text-zinc-900 hover:bg-amber-200 active:scale-[0.99]"
              >
                {set === item.sets && !nextItem ? "Finish workout ✓" : "Set done ✓"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => jump(index - 1)}
          className="rounded-full bg-zinc-900 px-4 py-2 font-semibold disabled:opacity-30"
        >
          ← Prev
        </button>
        {nextItem ? (
          <button type="button" onClick={() => jump(index + 1)} className="min-w-0 truncate rounded-full bg-zinc-900 px-4 py-2 font-semibold">
            Next: {getExercise(nextItem.slug)!.name} →
          </button>
        ) : (
          <span className="text-zinc-500">Last exercise</span>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Form check:{" "}
        <Link href={`/exercises/${exercise.slug}`} className="text-amber-300 hover:underline">
          full instructions for {exercise.name}
        </Link>
      </p>
    </div>
  );
}
