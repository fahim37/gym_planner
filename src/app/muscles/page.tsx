import type { Metadata } from "next";
import Link from "next/link";
import BodyExplorer from "@/components/BodyExplorer";
import { ChevronRight } from "@/components/icons";
import { SectionTitle } from "@/components/ui";
import { exercisesForMuscle } from "@/lib/queries";
import { REGIONS, musclesInRegion } from "@/lib/muscles";

export const metadata: Metadata = { title: "Muscles" };

export default function MusclesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:py-10">
      <SectionTitle kicker="Muscle map" title="Pick a muscle" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
        <BodyExplorer className="aspect-[5/6] w-full lg:sticky lg:top-[calc(var(--header-offset)+1.25rem)] lg:aspect-[4/5] lg:self-start" />
        <div className="space-y-6">
          {/* Jump to a body region. */}
          <nav aria-label="Body regions" className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0">
            {REGIONS.map((region) => (
              <a
                key={region}
                href={`#region-${region}`}
                className="glass-chip flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-zinc-200 transition-transform duration-300 ease-spring active:scale-90"
              >
                {region}
              </a>
            ))}
          </nav>
          {REGIONS.map((region) => (
            <section key={region} id={`region-${region}`} className="scroll-mt-[calc(var(--header-offset)+1rem)]">
              <h3 className="display mb-2 text-xl text-zinc-400">{region}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {musclesInRegion(region).map((m) => {
                  const { primary, secondary } = exercisesForMuscle(m.id);
                  return (
                    <Link
                      key={m.id}
                      href={`/muscles/${m.id}`}
                      className="surface flex items-center gap-3 rounded-[1.25rem] p-4 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-[0.97]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-bold">{m.name}</span>
                          <span className="text-xs text-zinc-500">{primary.length + secondary.length} exercises</span>
                        </span>
                        <span className="block text-xs italic text-zinc-500">{m.latin}</span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-zinc-500" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
