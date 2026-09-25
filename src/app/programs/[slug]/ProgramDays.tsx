"use client";

import Link from "next/link";
import ExerciseThumb from "@/components/ExerciseThumb";
import { CheckIcon, ChevronRight, PlayIcon } from "@/components/icons";
import { getExercise } from "@/data/exercises";
import type { Program } from "@/data/programs";
import { useProgress } from "@/lib/progress";

export default function ProgramDays({ program }: { program: Program }) {
  const { done, reset } = useProgress(program.slug);
  const next = program.days.findIndex((_, i) => !done.includes(i + 1));

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {done.length} of {program.days.length} workouts complete
        </p>
        {done.length > 0 && (
          <button type="button" onClick={reset} className="h-9 rounded-full px-3 text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            Reset progress
          </button>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
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
              className={`surface animate-rise rounded-[1.75rem] p-4 sm:p-5 ${
                isNext ? "shadow-[inset_0_0_0_1.5px_rgba(252,211,77,0.55),0_16px_40px_-20px_rgba(252,211,77,0.35)]" : ""
              }`}
              style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-full bg-white px-4 py-1 text-lg font-black text-zinc-900 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]">
                    {day.title.toUpperCase()}
                  </span>
                  <span className="truncate text-sm text-zinc-400">{day.focus}</span>
                  {complete && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                      <CheckIcon size={12} strokeWidth={3} /> Done
                    </span>
                  )}
                </div>
                <Link
                  href={`/programs/${program.slug}/day/${n}`}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-transform duration-300 ease-spring active:scale-95 sm:w-auto ${
                    isNext
                      ? "bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-amber-200"
                      : "glass-chip text-white hover:bg-white/10"
                  }`}
                >
                  {complete ? "Do again" : "Start workout"} <ChevronRight size={16} />
                </Link>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {day.exercises.map((x) => {
                  const e = getExercise(x.slug)!;
                  return (
                    <li key={x.slug}>
                      <Link
                        href={`/exercises/${x.slug}`}
                        className="glass-chip flex items-center gap-3 rounded-[1.25rem] p-2 pr-3 transition-transform duration-300 ease-spring hover:bg-white/10 active:scale-[0.97]"
                      >
                        <ExerciseThumb slug={x.slug} className="h-16 w-16 shrink-0 rounded-[0.9rem]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{e.name}</div>
                          <div className="text-xs font-extrabold uppercase text-amber-300">
                            {x.sets} sets × {x.reps}
                          </div>
                        </div>
                        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                      </Link>
                    </li>
                  );
                })}
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
