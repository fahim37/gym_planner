import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { REGIONS, type BodyRegion } from "@/lib/muscles";
import ExerciseBrowser from "./ExerciseBrowser";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const { region } = await searchParams;
  const initialRegion = REGIONS.find((r) => r === region) as BodyRegion | undefined;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle kicker="Exercise library" title="Every move, animated" />
      <ExerciseBrowser key={initialRegion ?? "all"} initialRegion={initialRegion} />
    </div>
  );
}
