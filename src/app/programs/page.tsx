import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { PROGRAMS } from "@/data/programs";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle kicker="Follow a plan" title="Programs" />
      <div className="grid gap-5 md:grid-cols-2">
        {PROGRAMS.map((p) => {
          const moves = new Set(p.days.flatMap((d) => d.exercises.map((e) => e.slug))).size;
          return (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="group relative overflow-hidden rounded-3xl bg-zinc-900 p-6 ring-1 ring-white/10 transition hover:ring-white/30"
            >
              <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${p.accent}`} />
              <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <span>{p.level}</span>·<span>{p.daysPerWeek}× per week</span>·<span>{p.equipment}</span>
              </div>
              <h2 className="display mt-3 text-3xl group-hover:text-amber-300">{p.name}</h2>
              <p className="mt-2 text-zinc-300">{p.description}</p>
              <div className="mt-5 flex gap-6 text-sm">
                <div>
                  <div className="text-2xl font-black text-amber-300">{p.days.length}</div>
                  <div className="text-xs text-zinc-500">workouts</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-300">{moves}</div>
                  <div className="text-xs text-zinc-500">exercises</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
