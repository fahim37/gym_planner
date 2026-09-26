"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/icons";
import { ExerciseCard } from "@/components/ui";
import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT_TYPES, LEVELS, type Equipment, type Level } from "@/lib/exercise-types";
import { REGIONS, type BodyRegion } from "@/lib/muscles";
import { scrollBehavior } from "@/lib/motion";
import { currentKey, isReturnVisit, replaceTop, saveTabUrl } from "@/lib/nav-memory";
import { findExercises } from "@/lib/queries";

/** Equipment types that at least one exercise uses, in catalogue order. */
const EQUIPMENT: Equipment[] = EQUIPMENT_TYPES.filter((t) => EXERCISES.some((e) => e.equipment.includes(t)));

/** Quick searches shown under an empty search box. */
const SUGGESTIONS = ["Squat", "Bench press", "Curl", "Row", "Pull-up", "Plank", "Deadlift", "Shoulder press"];

export interface BrowserState {
  q?: string;
  region?: BodyRegion;
  equipment?: Equipment;
  level?: Level;
}

function Pill({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`hit flex h-10 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full pl-4 text-sm font-semibold transition-[transform,background-color,color] duration-300 ease-spring active:scale-90 ${
        count === undefined ? "pr-4" : "pr-1.5"
      } ${active ? "bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" : "glass-chip text-zinc-100 hover:bg-white/10"}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
            active ? "bg-zinc-900/15 text-zinc-900" : "bg-white/10 text-zinc-300"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Wrapping option grid for the filter sheet. */
function Options<T extends string>({ value, options, onChange }: { value?: T; options: readonly T[]; onChange: (v?: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill active={!value} onClick={() => onChange(undefined)}>
        Any
      </Pill>
      {options.map((o) => (
        <Pill key={o} active={value === o} onClick={() => onChange(value === o ? undefined : o)}>
          {o}
        </Pill>
      ))}
    </div>
  );
}

export default function ExerciseBrowser({ initial }: { initial: BrowserState }) {
  const [q, setQ] = useState(initial.q ?? "");
  const [region, setRegion] = useState<BodyRegion | undefined>(initial.region);
  const [equipment, setEquipment] = useState<Equipment | undefined>(initial.equipment);
  const [level, setLevel] = useState<Level | undefined>(initial.level);
  const [sheet, setSheet] = useState(false);
  const [focused, setFocused] = useState(false);
  // Coming back to the list: no entrance animation, the grid is simply there.
  const [animate] = useState(() => typeof window === "undefined" || !isReturnVisit());
  const inputRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => findExercises({ q, region, equipment, level }), [q, region, equipment, level]);
  const regionCounts = useMemo(() => {
    const all = findExercises({ q, equipment, level });
    return { all: all.length, ...Object.fromEntries(REGIONS.map((r) => [r, all.filter((e) => e.region === r).length])) } as Record<string, number>;
  }, [q, equipment, level]);
  const extraFilters = (equipment ? 1 : 0) + (level ? 1 : 0);
  const anyFilter = Boolean(q || region || equipment || level);

  // The search button in the top bar links to /exercises#search.
  useEffect(() => {
    if (window.location.hash === "#search") inputRef.current?.focus();
  }, []);

  // Filters live in the URL, so Back, reloads and shared links all keep them.
  useEffect(() => {
    const url = new URL(window.location.href);
    const params: [string, string | undefined][] = [
      ["q", q.trim() || undefined],
      ["region", region],
      ["equipment", equipment],
      ["level", level],
    ];
    for (const [k, v] of params) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    url.hash = "";
    if (url.href === window.location.href) return;
    window.history.replaceState(window.history.state, "", url);
    replaceTop(currentKey());
    saveTabUrl("/exercises", currentKey());
  }, [q, region, equipment, level]);

  // Keep the selected body part chip in view.
  useEffect(() => {
    const row = chipsRef.current;
    const el = row?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (row && el) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: scrollBehavior() });
  }, [region]);

  const pickRegion = (r?: BodyRegion) => {
    setRegion(r);
    if (window.scrollY > 200) window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  const clearAll = () => {
    setQ("");
    setRegion(undefined);
    setEquipment(undefined);
    setLevel(undefined);
  };

  return (
    <>
      <div className="glass sticky top-[calc(var(--header-offset)+0.5rem)] z-20 -mx-2 space-y-2 rounded-[1.6rem] p-2 md:static md:mx-0 md:mb-8 md:space-y-3 md:p-4">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search exercises</span>
            <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              id="search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.blur()}
              placeholder="Exercise or muscle"
              className="glass-chip h-11 w-full rounded-full pl-10 pr-11 text-base outline-none placeholder:text-zinc-400 focus:bg-white/10 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full text-zinc-300 hover:text-white active:scale-90"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                  <CloseIcon size={14} strokeWidth={2.5} />
                </span>
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label={`Equipment and level filters${extraFilters ? ` (${extraFilters} active)` : ""}`}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-spring active:scale-90 md:hidden ${
              extraFilters ? "bg-amber-300 text-zinc-900" : "glass-chip text-zinc-100"
            }`}
          >
            <FilterIcon size={19} />
            {extraFilters > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-zinc-900 px-1 text-[11px] font-bold text-amber-300 ring-2 ring-amber-300">
                {extraFilters}
              </span>
            )}
          </button>
        </div>

        {focused && !q && (
          <div className="-mx-2 -my-0.5 flex items-center gap-2 overflow-x-auto px-3 py-0.5 no-scrollbar animate-fade [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] md:flex-wrap md:overflow-visible md:[mask-image:none]">
            <span className="shrink-0 text-meta font-semibold text-zinc-400">Try</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(s);
                  inputRef.current?.blur();
                }}
                className="hit h-9 shrink-0 whitespace-nowrap rounded-full bg-white/5 px-3.5 text-meta font-semibold text-zinc-200 ring-1 ring-white/10 transition-transform duration-300 ease-spring hover:bg-white/10 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Body parts: one swipeable row with live counts; the right edge fades to show there's more. */}
        <div
          ref={chipsRef}
          className="-mx-2 -my-0.5 flex snap-x scroll-px-2 gap-2 overflow-x-auto px-2 py-0.5 no-scrollbar [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]"
        >
          <Pill active={!region} onClick={() => pickRegion(undefined)} count={regionCounts.all}>
            All
          </Pill>
          {REGIONS.map((r) => (
            <Pill key={r} active={region === r} onClick={() => pickRegion(region === r ? undefined : r)} count={regionCounts[r]}>
              {r}
            </Pill>
          ))}
        </div>

        <div className="hidden space-y-3 md:block">
          {(
            [
              ["Equipment", <Options key="e" value={equipment} options={EQUIPMENT} onChange={setEquipment} />],
              ["Level", <Options key="l" value={level} options={LEVELS} onChange={setLevel} />],
            ] as const
          ).map(([label, options]) => (
            <div key={label} className="flex items-start gap-4">
              <span className="section-label w-24 shrink-0 pt-2.5">{label}</span>
              {options}
            </div>
          ))}
        </div>
      </div>

      {/* Result count and the active filters, each removable with one tap. */}
      <div className="mb-3 mt-4 flex min-h-9 flex-wrap items-center gap-2 md:mt-0">
        <p className="mr-auto text-sm text-zinc-400" aria-live="polite">
          <span className="font-bold tabular-nums text-white">{results.length}</span> exercise{results.length === 1 ? "" : "s"}
        </p>
        {equipment && (
          <button
            type="button"
            onClick={() => setEquipment(undefined)}
            aria-label={`Remove filter: ${equipment}`}
            className="hit flex h-9 items-center gap-1 rounded-full bg-amber-300/15 pl-3.5 pr-2.5 text-meta font-semibold text-amber-200 ring-1 ring-amber-300/40 transition-transform duration-300 ease-spring active:scale-95"
          >
            {equipment}
            <CloseIcon size={14} />
          </button>
        )}
        {level && (
          <button
            type="button"
            onClick={() => setLevel(undefined)}
            aria-label={`Remove filter: ${level}`}
            className="hit flex h-9 items-center gap-1 rounded-full bg-amber-300/15 pl-3.5 pr-2.5 text-meta font-semibold text-amber-200 ring-1 ring-amber-300/40 transition-transform duration-300 ease-spring active:scale-95"
          >
            {level}
            <CloseIcon size={14} />
          </button>
        )}
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="hit -mr-1 h-9 rounded-full px-3 text-meta font-semibold text-amber-300 transition-transform duration-300 ease-spring hover:bg-white/5 active:scale-95"
          >
            Clear all
          </button>
        )}
      </div>

      {results.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((e, i) => (
            <div key={e.slug} className={animate ? "animate-rise" : undefined} style={animate ? { animationDelay: `${Math.min(i, 10) * 35}ms` } : undefined}>
              <ExerciseCard exercise={e} />
            </div>
          ))}
        </div>
      ) : (
        <div className="surface flex flex-col items-center rounded-[1.75rem] px-6 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.07] text-zinc-300">
            <SearchIcon size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-white">No matches</h2>
          <p className="mt-1 max-w-xs text-md text-zinc-400">
            Nothing matches{q ? <> &ldquo;{q}&rdquo;</> : null}
            {region ? ` in ${region}` : ""}
            {equipment || level ? " with these filters" : ""}. Try a shorter word or a muscle name.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-5 h-12 rounded-full bg-amber-300 px-6 text-base font-bold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-95"
          >
            Show all exercises
          </button>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.slice(0, 5).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  clearAll();
                  setQ(s);
                }}
                className="hit h-9 rounded-full bg-white/5 px-3.5 text-meta font-semibold text-zinc-200 ring-1 ring-white/10 transition-transform duration-300 ease-spring hover:bg-white/10 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} label="Filter exercises">
        {(close) => (
          <div className="space-y-6 pb-2">
            <h2 className="display text-3xl">Filters</h2>
            <div>
              <h3 className="section-label mb-3">Equipment</h3>
              <Options value={equipment} options={EQUIPMENT} onChange={setEquipment} />
            </div>
            <div>
              <h3 className="section-label mb-3">Level</h3>
              <Options value={level} options={LEVELS} onChange={setLevel} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEquipment(undefined);
                  setLevel(undefined);
                }}
                className="glass-chip h-12 rounded-full px-5 text-base font-bold transition-transform duration-300 ease-spring active:scale-90"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={close}
                className="h-12 flex-1 rounded-full bg-amber-300 text-base font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-300 ease-spring active:scale-95"
              >
                Show {results.length} exercise{results.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
