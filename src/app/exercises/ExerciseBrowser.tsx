"use client";

import { useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ui";
import type { Equipment, Level } from "@/lib/exercise-types";
import { REGIONS, type BodyRegion } from "@/lib/muscles";
import { findExercises } from "@/lib/queries";

const EQUIPMENT: Equipment[] = ["Barbell", "Dumbbell", "Bodyweight", "Kettlebell", "Cable", "Pull-up bar", "Bench"];
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];

function Chips<T extends string>({ value, options, onChange, all }: { value?: T; options: readonly T[]; onChange: (v?: T) => void; all: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[undefined, ...options].map((o) => (
        <button
          key={o ?? "all"}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            value === o ? "bg-amber-300 text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
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

  const results = useMemo(() => findExercises({ q, region, equipment, level }), [q, region, equipment, level]);

  const selectRegion = (r?: BodyRegion) => {
    setRegion(r);
    const url = new URL(window.location.href);
    if (r) url.searchParams.set("region", r);
    else url.searchParams.delete("region");
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <div className="mb-8 space-y-3 rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/10">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: squat, biceps, dumbbell…"
          className="w-full rounded-full bg-zinc-800 px-4 py-2.5 text-sm outline-none ring-amber-300 placeholder:text-zinc-500 focus:ring-2"
        />
        <Chips value={region} options={REGIONS} onChange={selectRegion} all="All body parts" />
        <Chips value={equipment} options={EQUIPMENT} onChange={setEquipment} all="Any equipment" />
        <Chips value={level} options={LEVELS} onChange={setLevel} all="Any level" />
      </div>
      <p className="mb-4 text-sm text-zinc-400">
        {results.length} exercise{results.length === 1 ? "" : "s"}
      </p>
      {results.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((e) => (
            <ExerciseCard key={e.slug} exercise={e} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-zinc-900 p-8 text-center text-zinc-400">No exercises match those filters.</p>
      )}
    </>
  );
}
