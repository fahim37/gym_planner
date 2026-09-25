"use client";

import { useState } from "react";
import EquipmentCard from "@/components/EquipmentCard";
import { GLASS_ACTIVE, GLASS_CHIP, SPRING } from "@/components/EquipmentGlass";
import type { EquipmentCategory } from "@/lib/equipment-catalog";
import type { EquipmentSummary } from "@/lib/equipment-types";

interface Group {
  category: EquipmentCategory;
  slug: string;
  items: EquipmentSummary[];
}

/** Category chips over the equipment gallery; the choice is mirrored in ?category=. */
export default function EquipmentBrowser({ groups, initial }: { groups: Group[]; initial?: string }) {
  const [selected, setSelected] = useState<string | undefined>(initial);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const shown = selected ? groups.filter((g) => g.slug === selected) : groups;

  const select = (slug?: string) => {
    setSelected(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("category", slug);
    else url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  };

  const chip = (active: boolean) =>
    `flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${SPRING} active:scale-95 ${
      active ? GLASS_ACTIVE : GLASS_CHIP
    }`;
  const count = (active: boolean) => `text-xs ${active ? "text-zinc-700" : "text-zinc-500"}`;

  return (
    <>
      <div
        className="-mx-4 mb-6 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label="Filter by category"
      >
        <button type="button" onClick={() => select()} aria-pressed={!selected} className={chip(!selected)}>
          All <span className={count(!selected)}>{total}</span>
        </button>
        {groups.map((g) => (
          <button key={g.slug} type="button" onClick={() => select(g.slug)} aria-pressed={selected === g.slug} className={chip(selected === g.slug)}>
            {g.category} <span className={count(selected === g.slug)}>{g.items.length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {shown.map((g) => (
          <section key={g.slug} aria-labelledby={`cat-${g.slug}`}>
            <h2 id={`cat-${g.slug}`} className="display mb-4 flex items-baseline gap-2 text-2xl sm:text-3xl">
              {g.category}
              <span className="text-sm font-bold not-italic text-zinc-500">{g.items.length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {g.items.map((item) => (
                <EquipmentCard key={item.slug} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
