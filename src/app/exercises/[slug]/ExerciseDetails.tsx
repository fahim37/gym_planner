"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronRight } from "@/components/icons";
import { NoteList, Steps } from "@/components/ui";
import { MUSCLES, type MuscleId } from "@/lib/muscles";

type TabId = "how" | "tips" | "mistakes" | "muscles";

const TABS: { id: TabId; label: string }[] = [
  { id: "how", label: "How to" },
  { id: "tips", label: "Tips" },
  { id: "mistakes", label: "Mistakes" },
  { id: "muscles", label: "Muscles" },
];

interface Props {
  steps: string[];
  tips: string[];
  mistakes: string[];
  breathing: string;
  primary: MuscleId[];
  secondary: MuscleId[];
}

/**
 * Instructions for an exercise. Phones get sticky tabs (swipe the panel to move
 * between them); large screens show every section stacked.
 */
export default function ExerciseDetails({ steps, tips, mistakes, breathing, primary, secondary }: Props) {
  const [tab, setTab] = useState<TabId>("how");
  const anchorRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const select = (next: TabId) => {
    setTab(next);
    // If the tabs are stuck under the top bar, bring the new panel's start into view.
    const anchor = anchorRef.current;
    if (!anchor) return;
    const offset = parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0;
    if (anchor.getBoundingClientRect().top < offset) anchor.scrollIntoView({ block: "start" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const i = TABS.findIndex((t) => t.id === tab) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < TABS.length) select(TABS[i].id);
  };

  const panel = (id: TabId) => `${tab === id ? "animate-fade block" : "hidden"} lg:block`;

  return (
    <div className="mt-6">
      <div ref={anchorRef} className="scroll-mt-[calc(var(--header-offset)+0.5rem)]" />
      <div
        role="tablist"
        aria-label="Exercise details"
        className="pointer-events-none sticky top-[calc(var(--header-offset)+0.5rem)] z-20 -mx-1 lg:hidden"
      >
        <div className="glass pointer-events-auto relative grid grid-cols-4 rounded-full p-1">
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_-4px_rgba(252,211,77,0.6)] transition-transform duration-500 ease-spring"
            style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}
              className={`relative h-11 rounded-full text-sm font-bold transition-transform duration-300 ease-spring active:scale-90 ${
                tab === t.id ? "text-zinc-900" : "text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="min-h-[40svh] touch-pan-y pt-5 lg:min-h-0 lg:space-y-8 lg:pt-0"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <section id="panel-how" role="tabpanel" aria-labelledby="tab-how" className={panel("how")}>
          <h2 className="section-label mb-4 hidden lg:block">How to do it</h2>
          <Steps steps={steps} />
          <div className="mt-5 rounded-[1.25rem] bg-sky-500/10 p-4 text-md text-zinc-200 ring-1 ring-sky-400/30">
            <span className="font-bold text-sky-300">Breathing: </span>
            {breathing}
          </div>
        </section>

        <div className="lg:grid lg:grid-cols-2 lg:gap-3">
          <section id="panel-tips" role="tabpanel" aria-labelledby="tab-tips" className={panel("tips")}>
            <NoteList tone="good" title="Pro tips" items={tips} />
          </section>
          <section id="panel-mistakes" role="tabpanel" aria-labelledby="tab-mistakes" className={panel("mistakes")}>
            <NoteList tone="bad" title="Common mistakes" items={mistakes} />
          </section>
        </div>

        <section id="panel-muscles" role="tabpanel" aria-labelledby="tab-muscles" className={panel("muscles")}>
          <h2 className="section-label mb-3 hidden lg:block">Muscles worked</h2>
          <ul className="space-y-2">
            {[...primary.map((id) => ({ id, main: true })), ...secondary.map((id) => ({ id, main: false }))].map(({ id, main }) => (
              <li key={id}>
                <Link
                  href={`/muscles/${id}`}
                  className="surface flex items-center gap-3 rounded-[1.25rem] px-4 py-3 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-[0.98]"
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full ${main ? "bg-red-600" : "bg-orange-300"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-base font-bold">{MUSCLES[id].name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          main ? "bg-red-600/20 text-red-300" : "bg-orange-300/15 text-orange-200"
                        }`}
                      >
                        {main ? "Target" : "Also working"}
                      </span>
                    </span>
                    <span className="mt-1 block text-meta text-zinc-400">{MUSCLES[id].function}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-zinc-500" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
