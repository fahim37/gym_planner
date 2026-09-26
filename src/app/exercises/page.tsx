import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { EQUIPMENT_TYPES, LEVELS } from "@/lib/exercise-types";
import { REGIONS } from "@/lib/muscles";
import ExerciseBrowser from "./ExerciseBrowser";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const initial = {
    q: one(sp.q)?.slice(0, 80),
    region: REGIONS.find((r) => r === one(sp.region)),
    equipment: EQUIPMENT_TYPES.find((t) => t === one(sp.equipment)),
    level: LEVELS.find((l) => l === one(sp.level)),
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:py-10">
      <SectionTitle kicker="Exercise library" title="Every move, animated" />
      <ExerciseBrowser initial={initial} />
    </div>
  );
}
