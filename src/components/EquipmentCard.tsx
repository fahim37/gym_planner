import Link from "next/link";
import type { EquipmentSummary } from "@/lib/equipment-types";
import { SPRING, SURFACE } from "./EquipmentGlass";
import EquipmentThumb from "./EquipmentThumb";

/** Gallery card: 3D still, name, one-line summary, part and exercise counts. */
export default function EquipmentCard({ item }: { item: EquipmentSummary }) {
  const n = item.exercises.length;
  return (
    <Link
      href={`/equipment/${item.slug}`}
      className={`group flex flex-col overflow-hidden rounded-[1.6rem] p-1.5 text-white glass-reactive ${SURFACE} ${SPRING} hover:-translate-y-1 active:scale-[0.97]`}
    >
      <EquipmentThumb slug={item.slug} className="aspect-[4/3] rounded-[1.2rem]" />
      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-2.5 sm:gap-2 sm:px-2.5 sm:pb-2.5">
        <h3 className="display text-base leading-[1.05] sm:text-lg">{item.name}</h3>
        <p className="line-clamp-2 text-meta text-zinc-300 sm:text-sm">{item.summary}</p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-1 text-2xs font-extrabold uppercase tracking-wide text-zinc-400 sm:text-xs">
          <span>{item.parts.length} parts</span>
          <span className={n ? "text-red-400" : "text-amber-300/80"}>{n ? `${n} exercise${n === 1 ? "" : "s"}` : "Guide"}</span>
        </div>
      </div>
    </Link>
  );
}
