"use client";

import Link from "next/link";
import { CheckIcon, PlayIcon } from "@/components/icons";
import { ExerciseCard } from "@/components/ui";
import { getExercise } from "@/data/exercises";
import type { Program } from "@/data/programs";
import { useProgress } from "@/lib/progress";

export default function ProgramDays({ program }: { program: Program }) {
  const { done, reset } = useProgress(program.slug);
  const next = program.days.findIndex((_, i) => !done.includes(i + 1));

  return (
    <>
      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-between gap-x-3">
        <p className="text-sm text-zinc-300">
          <span className="font-bold tabular-nums text-white">{done.length}</span> of {program.days.length} workouts complete
        </p>
        {done.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="-mr-3 h-11 rounded-full px-3 text-meta font-semibold text-zinc-400 transition-transform duration-300 ease-spring hover:text-zinc-200 active:scale-95"
          >
            Reset progress
          </button>
        )}
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full origin-left bg-gradient-to-r ${program.accent} transition-transform duration-700 ease-spring`}
          style={{ transform: `scaleX(${done.length / program.days.length})` }}
        />
      </div>

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
        {program.days.map((day, i) => {
          const n = i + 1;
          const complete = done.includes(n);
          const isNext = i === next;
          return (
            <section
              key={n}
              className={`animate-rise overflow-hidden rounded-[1.75rem] bg-white p-3 text-zinc-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] sm:p-5 ${
                isNext ? "ring-2 ring-amber-300" : "ring-1 ring-black/5"
              }`}
              style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
            >
              {/* A workout sheet, like a gym "challenge" chart: big title, yellow label, numbered moves. */}
              <div className="flex flex-wrap items-start justify-between gap-3 px-1 pt-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-condensed text-[2.4rem] font-extrabold uppercase leading-[0.9] tracking-tight">{day.title}</h2>
                    {complete && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckIcon size={12} strokeWidth={3} /> Done
                      </span>
                    )}
                    {isNext && !complete && (
                      <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-bold text-zinc-900">Up next</span>
                    )}
                  </div>
                  <p className="mt-2 inline-block bg-amber-300 px-2.5 py-1 font-condensed text-lg font-extrabold uppercase leading-none tracking-wide">
                    {day.focus}
                  </p>
                  <p className="mt-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                    {day.exercises.length} exercises · {day.exercises.reduce((a, x) => a + x.sets, 0)} sets
                  </p>
                </div>
                <Link
                  href={`/programs/${program.slug}/day/${n}`}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-transform duration-300 ease-spring active:scale-95 sm:w-auto ${
                    isNext ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  }`}
                >
                  <PlayIcon size={16} /> {complete ? "Do again" : "Start workout"}
                </Link>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {day.exercises.map((x, k) => (
                  <li key={x.slug} className="[&>a]:shadow-none [&>a]:ring-zinc-200">
                    <ExerciseCard exercise={getExercise(x.slug)!} index={k + 1} sets={String(x.sets)} reps={x.reps} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Phones: the next workout is always one tap away, floating above the tab bar. */}
      {next >= 0 && (
        <>
          <div aria-hidden className="h-20 md:hidden" />
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-offset)+0.25rem)] z-30 flex justify-center px-4 md:hidden">
            <Link
              href={`/programs/${program.slug}/day/${next + 1}`}
              className="glass-reactive animate-rise pointer-events-auto flex h-14 w-full max-w-md items-center justify-center gap-2 overflow-hidden rounded-full bg-amber-300 text-base font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_30px_-8px_rgba(0,0,0,0.7),0_8px_24px_-10px_rgba(252,211,77,0.7)] transition-transform duration-300 ease-spring active:scale-95"
            >
              <PlayIcon size={18} />
              Start {program.days[next].title}
            </Link>
          </div>
        </>
      )}
    </>
  );
}
