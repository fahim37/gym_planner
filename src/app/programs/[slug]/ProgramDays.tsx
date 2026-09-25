"use client";

import Link from "next/link";
import ExerciseThumb from "@/components/ExerciseThumb";
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
          <button type="button" onClick={reset} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            Reset progress
          </button>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full bg-gradient-to-r ${program.accent} transition-all`}
          style={{ width: `${(done.length / program.days.length) * 100}%` }}
        />
      </div>

      <div className="mt-8 space-y-5">
        {program.days.map((day, i) => {
          const n = i + 1;
          const complete = done.includes(n);
          return (
            <section key={n} className={`rounded-3xl bg-zinc-900 p-5 ring-1 ${i === next ? "ring-amber-300/60" : "ring-white/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white px-4 py-1 text-lg font-black text-zinc-900">{day.title.toUpperCase()}</span>
                  <span className="text-sm text-zinc-400">{day.focus}</span>
                  {complete && <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">✓ Done</span>}
                </div>
                <Link
                  href={`/programs/${program.slug}/day/${n}`}
                  className={`rounded-full px-5 py-2 text-sm font-bold ${
                    i === next ? "bg-amber-300 text-zinc-900 hover:bg-amber-200" : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {complete ? "Do again" : "Start workout"} →
                </Link>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {day.exercises.map((x) => {
                  const e = getExercise(x.slug)!;
                  return (
                    <li key={x.slug}>
                      <Link href={`/exercises/${x.slug}`} className="flex items-center gap-3 rounded-2xl bg-zinc-800/60 p-2 pr-3 hover:bg-zinc-800">
                        <ExerciseThumb slug={x.slug} className="h-16 w-16 shrink-0 rounded-xl" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{e.name}</div>
                          <div className="text-xs font-extrabold uppercase text-amber-300">
                            {x.sets} sets × {x.reps}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
