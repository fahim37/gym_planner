import type { Metadata } from "next";
import Link from "next/link";
import BodyExplorer from "@/components/BodyExplorer";
import { SectionTitle } from "@/components/ui";
import { exercisesForMuscle } from "@/lib/queries";
import { REGIONS, musclesInRegion } from "@/lib/muscles";

export const metadata: Metadata = { title: "Muscles" };

export default function MusclesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle kicker="Muscle map" title="Pick a muscle" />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <BodyExplorer className="aspect-[4/5] w-full lg:sticky lg:top-20 lg:self-start" />
        <div className="space-y-6">
          {REGIONS.map((region) => (
            <div key={region}>
              <h3 className="display mb-2 text-xl text-zinc-400">{region}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {musclesInRegion(region).map((m) => {
                  const { primary, secondary } = exercisesForMuscle(m.id);
                  return (
                    <Link
                      key={m.id}
                      href={`/muscles/${m.id}`}
                      className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/10 transition hover:bg-zinc-800 hover:ring-red-500/50"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold">{m.name}</span>
                        <span className="text-xs text-zinc-500">{primary.length + secondary.length} exercises</span>
                      </div>
                      <div className="text-xs italic text-zinc-500">{m.latin}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
