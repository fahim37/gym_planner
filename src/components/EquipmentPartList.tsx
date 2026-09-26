"use client";

import type { EquipmentPart } from "@/lib/equipment-types";
import { useEquipmentFocus } from "./EquipmentFocus";
import { BEAD, GLASS_ACTIVE, SPRING, SURFACE } from "./EquipmentGlass";

/** Numbered part list; tapping a part focuses it in the page's EquipmentViewer. */
export default function EquipmentPartList({ parts }: { parts: EquipmentPart[] }) {
  const { focus, setFocus } = useEquipmentFocus();
  return (
    <ol className="space-y-2">
      {parts.map((p, i) => {
        const on = focus.id === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setFocus(on ? null : p.id, "list")}
              aria-pressed={on}
              className={`flex w-full items-start gap-3 rounded-[1.4rem] p-3 text-left ${SPRING} active:scale-[0.98] ${
                on
                  ? `${SURFACE} bg-amber-300/[0.12]`
                  : `glass-reactive ${SURFACE} hover:bg-white/[0.07]`
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${SPRING} ${
                  on ? `scale-110 ${GLASS_ACTIVE}` : BEAD
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-white">{p.label}</span>
                  <span className={`shrink-0 text-xs font-semibold ${on ? "text-amber-300" : "text-zinc-400"}`}>{on ? "Showing" : "Show in 3D"}</span>
                </span>
                <span className={`mt-0.5 block text-md text-zinc-300 ${on ? "" : "line-clamp-2"}`}>{p.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
