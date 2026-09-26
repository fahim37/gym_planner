"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/icons";
import { ExerciseCard } from "@/components/ui";
import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT_TYPES, LEVELS, type Equipment, type Level } from "@/lib/exercise-types";
import { REGIONS, type BodyRegion } from "@/lib/muscles";
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
      className={`flex h-9 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full pl-3.5 text-[13px] font-semibold transition-[transform,background-color,color] duration-300 ease-spring active:scale-90 ${
        count === undefined ? "pr-3.5" : "pr-1.5"
      } ${active ? "bg-amber-300 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" : "glass-chip text-zinc-200 hover:bg-white/10"}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
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
    if (row && el) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [region]);

  const pickRegion = (r?: BodyRegion) => {
    setRegion(r);
    if (window.scrollY > 200) window.scrollTo({ top: 0, behavior: "smooth" });
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
              placeholder="Search exercises or muscles"
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
          <div className="flex flex-wrap gap-1.5 px-1 pb-1 animate-fade">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(s);
                  inputRef.current?.blur();
                }}
                className="h-8 rounded-full bg-white/5 px-3 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Body parts: one swipeable row with live counts; the right edge fades to show there's more. */}
        <div
          ref={chipsRef}
          className="-mx-2 flex snap-x scroll-px-2 gap-1.5 overflow-x-auto px-2 no-scrollbar [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]"
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
          <Options value={equipment} options={EQUIPMENT} onChange={setEquipment} />
          <Options value={level} options={LEVELS} onChange={setLevel} />
        </div>
      </div>

      {/* Result count and the active filters, each removable with one tap. */}
      <div className="mb-3 mt-3 flex min-h-8 flex-wrap items-center gap-1.5 md:mt-0">
        <p className="mr-auto text-sm text-zinc-400" aria-live="polite">
          <span className="font-bold tabular-nums text-white">{results.length}</span> exercise{results.length === 1 ? "" : "s"}
        </p>
        {equipment && (
          <button
            type="button"
            onClick={() => setEquipment(undefined)}
            className="flex h-8 items-center gap-1 rounded-full bg-amber-300/15 pl-3 pr-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/40 active:scale-95"
          >
            {equipment}
            <CloseIcon size={13} />
          </button>
        )}
        {level && (
          <button
            type="button"
            onClick={() => setLevel(undefined)}
            className="flex h-8 items-center gap-1 rounded-full bg-amber-300/15 pl-3 pr-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/40 active:scale-95"
          >
            {level}
            <CloseIcon size={13} />
          </button>
        )}
        {anyFilter && (
          <button type="button" onClick={clearAll} className="h-8 rounded-full px-2.5 text-xs font-semibold text-amber-300 hover:bg-white/5">
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
        <div className="surface rounded-[1.75rem] p-8 text-center text-zinc-400">
          <p className="text-pretty">
            No exercises match{q ? <> &ldquo;{q}&rdquo;</> : null}
            {region ? ` in ${region}` : ""}.
          </p>
          <button type="button" onClick={clearAll} className="glass-chip mt-4 h-11 rounded-full px-5 text-sm font-bold text-white transition-transform duration-300 ease-spring active:scale-90">
            Show all exercises
          </button>
        </div>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} label="Filter exercises">
        {(close) => (
          <div className="space-y-6 pb-2">
            <h2 className="display text-2xl">Filters</h2>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Equipment</h3>
              <Options value={equipment} options={EQUIPMENT} onChange={setEquipment} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Level</h3>
              <Options value={level} options={LEVELS} onChange={setLevel} />
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
