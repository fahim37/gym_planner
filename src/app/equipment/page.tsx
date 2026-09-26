import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { equipmentByCategory, parseCategory, categorySlug, summarizeEquipment } from "@/data/equipment";
import EquipmentBrowser from "./EquipmentBrowser";

export const metadata: Metadata = {
  title: "Gym equipment",
  description: "Every machine, bench and bar on the gym floor in interactive 3D — what each part does and how to use it safely.",
};

export default async function EquipmentPage({ searchParams }: PageProps<"/equipment">) {
  const { category } = await searchParams;
  const initial = parseCategory(typeof category === "string" ? category : undefined);
  const groups = equipmentByCategory().map((g) => ({ ...g, items: g.items.map(summarizeEquipment) }));
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:py-10">
      <SectionTitle as="h1" kicker="Gym floor guide" title="Know your equipment" />
      <p className="-mt-2 mb-6 max-w-2xl leading-relaxed text-zinc-300">
        Spin every machine, bench and bar in 3D, tap any part to see what it does, and learn how to set it up
        safely before your first set.
      </p>
      <EquipmentBrowser key={initial ?? "all"} groups={groups} initial={initial && categorySlug(initial)} />
    </div>
  );
}
