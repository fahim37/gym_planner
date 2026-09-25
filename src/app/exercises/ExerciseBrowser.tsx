"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/icons";
import { ExerciseCard } from "@/components/ui";
import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT_TYPES, LEVELS, type Equipment, type Level } from "@/lib/exercise-types";
import { REGIONS, type BodyRegion } from "@/lib/muscles";
import { findExercises } from "@/lib/queries";

/** Equipment types that at least one exercise uses, in catalogue order. */
const EQUIPMENT: Equipment[] = EQUIPMENT_TYPES.filter((t) => EXERCISES.some((e) => e.equipment.includes(t)));

/** One row of filter chips: scrolls sideways on phones, wraps on larger screens (or always, with `wrap`). */
function Chips<T extends string>({
  value,
  options,
  onChange,
  all,
  wrap,
}: {
  value?: T;
  options: readonly T[];
  onChange: (v?: T) => void;
  all: string;
  wrap?: boolean;
}) {
  return (
    <div
      className={
        wrap
          ? "flex flex-wrap gap-2"
          : "-mx-2 flex snap-x scroll-px-2 gap-2 overflow-x-auto rounded-full px-2 no-scrollbar md:mx-0 md:flex-wrap md:gap-1.5 md:overflow-visible md:rounded-none md:px-0"
      }
    >
      {[undefined, ...options].map((o) => (
        <button
          key={o ?? "all"}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`h-10 shrink-0 snap-start whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-transform duration-300 ease-spring active:scale-90 md:h-8 md:px-3 md:text-xs ${
            value === o ? "bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" : "glass-chip text-zinc-200 hover:bg-white/10"
          }`}
        >
          {o ?? all}
        </button>
      ))}
    </div>
  );
}

export default function ExerciseBrowser({ initialRegion }: { initialRegion?: BodyRegion }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<BodyRegion | undefined>(initialRegion);
  const [equipment, setEquipment] = useState<Equipment>();
  const [level, setLevel] = useState<Level>();
  const [sheet, setSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => findExercises({ q, region, equipment, level }), [q, region, equipment, level]);
  const extraFilters = (equipment ? 1 : 0) + (level ? 1 : 0);
  const anyFilter = Boolean(q || region || equipment || level);

  // The search button in the top bar links to /exercises#search.
  useEffect(() => {
    if (window.location.hash === "#search") inputRef.current?.focus();
  }, []);

  const selectRegion = (r?: BodyRegion) => {
    setRegion(r);
    const url = new URL(window.location.href);
    if (r) url.searchParams.set("region", r);
    else url.searchParams.delete("region");
    url.hash = "";
    window.history.replaceState(null, "", url);
  };

  const clearAll = () => {
    setQ("");
    selectRegion(undefined);
    setEquipment(undefined);
    setLevel(undefined);
  };

  return (
    <>
      <div className="glass sticky top-[calc(var(--header-offset)+0.5rem)] z-20 -mx-2 space-y-2 rounded-[1.75rem] p-2 md:static md:mx-0 md:mb-8 md:space-y-3 md:p-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search exercises</span>
            <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              ref={inputRef}
              id="search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search squat, biceps, dumbbell…"
              className="glass-chip h-11 w-full rounded-full pl-10 pr-10 text-base outline-none placeholder:text-zinc-400 focus:bg-white/10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:text-white"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label={`Filters${extraFilters ? ` (${extraFilters} active)` : ""}`}
            className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-transform duration-300 ease-spring active:scale-90 md:hidden ${
              extraFilters ? "bg-amber-300 text-zinc-900" : "glass-chip text-zinc-100"
            }`}
          >
            <FilterIcon size={18} />
            Filters
            {extraFilters > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-900 px-1 text-[11px] text-amber-300">
                {extraFilters}
              </span>
            )}
          </button>
        </div>
        <Chips value={region} options={REGIONS} onChange={selectRegion} all="All body parts" />
        <div className="hidden space-y-3 md:block">
          <Chips value={equipment} options={EQUIPMENT} onChange={setEquipment} all="Any equipment" />
          <Chips value={level} options={LEVELS} onChange={setLevel} all="Any level" />
        </div>
      </div>

      <div className="mb-3 mt-4 flex h-8 items-center justify-between md:mt-0">
        <p className="text-sm text-zinc-400" aria-live="polite">
          {results.length} exercise{results.length === 1 ? "" : "s"}
        </p>
        {anyFilter && (
          <button type="button" onClick={clearAll} className="h-8 rounded-full px-3 text-xs font-semibold text-amber-300 hover:bg-white/5">
            Clear filters
          </button>
        )}
      </div>
      {results.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((e, i) => (
            <div key={e.slug} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
              <ExerciseCard exercise={e} />
            </div>
          ))}
        </div>
      ) : (
        <div className="surface rounded-[1.75rem] p-8 text-center text-zinc-400">
          <p>No exercises match those filters.</p>
          <button type="button" onClick={clearAll} className="glass-chip mt-4 h-11 rounded-full px-5 text-sm font-bold text-white transition-transform duration-300 ease-spring active:scale-90">
            Clear filters
          </button>
        </div>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} label="Filter exercises">
        {(close) => (
          <div className="space-y-6 pb-2">
            <h2 className="display text-2xl">Filters</h2>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Equipment</h3>
              <Chips value={equipment} options={EQUIPMENT} onChange={setEquipment} all="Any" wrap />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Level</h3>
              <Chips value={level} options={LEVELS} onChange={setLevel} all="Any" wrap />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEquipment(undefined);
                  setLevel(undefined);
                }}
                className="glass-chip h-12 rounded-full px-5 text-sm font-bold transition-transform duration-300 ease-spring active:scale-90"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={close}
                className="h-12 flex-1 rounded-full bg-amber-300 text-sm font-black text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-300 ease-spring active:scale-95"
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
