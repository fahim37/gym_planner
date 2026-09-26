import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import { MetaBadges, SectionTitle } from "@/components/ui";
import { PROGRAMS } from "@/data/programs";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:py-10">
      <SectionTitle as="h1" kicker="Follow a plan" title="Programs" />
      <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">
        {PROGRAMS.map((p) => {
          const moves = new Set(p.days.flatMap((d) => d.exercises.map((e) => e.slug))).size;
          return (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="surface animate-rise group relative overflow-hidden rounded-[1.75rem] p-5 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-[0.97] sm:p-6"
            >
              <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${p.accent}`} />
              <MetaBadges items={[p.level, `${p.daysPerWeek}× per week`, p.equipment]} />
              <h2 className="display mt-3 text-3xl group-hover:text-amber-300">{p.name}</h2>
              {/* The full plan notes live on the program page. */}
              <p className="mt-2 line-clamp-3 leading-relaxed text-zinc-300">{p.description}</p>
              <div className="mt-5 flex items-end gap-6">
                <div>
                  <div className="text-2xl font-black tabular-nums text-amber-300">{p.days.length}</div>
                  <div className="text-meta text-zinc-400">workouts</div>
                </div>
                <div>
                  <div className="text-2xl font-black tabular-nums text-amber-300">{moves}</div>
                  <div className="text-meta text-zinc-400">exercises</div>
                </div>
                <span className="ml-auto flex h-11 items-center gap-1 text-sm font-bold text-amber-300">
                  View plan <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
