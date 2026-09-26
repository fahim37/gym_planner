"use client";

import Link from "next/link";
import { PROGRAMS } from "@/data/programs";
import { useProgressMap } from "@/lib/progress";
import { PlayIcon } from "./icons";

const SLUGS = PROGRAMS.map((p) => p.slug);

/** "Pick up where you left off": the next workout of a program that's in progress (progress lives in this browser). */
export default function ContinueCard({ className = "" }: { className?: string }) {
  const progress = useProgressMap(SLUGS);
  const program = PROGRAMS.find((p) => {
    const done = progress[p.slug] ?? [];
    return done.length > 0 && done.length < p.days.length;
  });
  if (!program) return null;
  const done = progress[program.slug];
  const next = program.days.findIndex((_, i) => !done.includes(i + 1));
  const day = program.days[next];

  return (
    <Link
      href={`/programs/${program.slug}/day/${next + 1}`}
      className={`glass glass-reactive animate-rise group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-4 transition-transform duration-300 ease-spring active:scale-[0.97] ${className}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${program.accent}`} />
      <div className="min-w-0 flex-1 pl-1">
        <p className="eyebrow text-amber-300">Continue your program</p>
        <p className="mt-1 line-clamp-2 text-lg font-black leading-snug">
          {program.name} · {day.title}
        </p>
        <p className="mt-0.5 text-meta text-zinc-400">
          {day.focus} · {day.exercises.length} exercises · {done.length}/{program.days.length} done
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full origin-left bg-gradient-to-r ${program.accent}`}
            style={{ transform: `scaleX(${done.length / program.days.length})` }}
          />
        </div>
      </div>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_20px_-6px_rgba(252,211,77,0.7)] transition-transform duration-500 ease-spring group-hover:scale-105">
        <PlayIcon size={22} />
      </span>
    </Link>
  );
}
