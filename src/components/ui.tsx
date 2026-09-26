import Link from "next/link";
import { Children, type ReactNode } from "react";
import type { Exercise } from "@/lib/exercise-types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import ExerciseThumb from "./ExerciseThumb";

export function MuscleChip({ id, emphasis }: { id: MuscleId; emphasis: "primary" | "secondary" }) {
  return (
    <Link
      href={`/muscles/${id}`}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-300 ease-spring hover:brightness-110 active:scale-90 ${
        emphasis === "primary" ? "bg-red-600 text-white" : "bg-orange-300/20 text-orange-200 ring-1 ring-orange-300/40"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${emphasis === "primary" ? "bg-white" : "bg-orange-300"}`} />
      {MUSCLES[id].name}
    </Link>
  );
}

/** "10–12 each leg" → "10–12/side": prescriptions that fit on one line of a card. */
export function shortReps(reps: string) {
  return reps.replace(/\s*(each|per)\s+(leg|side|arm)/i, "/side").replace(/\s*hold$/i, "");
}

/** Card in the style of a workout poster: 3D still, bold name, reps and sets. Fits two across on a phone. */
export function ExerciseCard({ exercise, sets, reps }: { exercise: Exercise; sets?: string; reps?: string }) {
  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] bg-white text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_18px_40px_-18px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-spring hover:-translate-y-1 active:scale-[0.96] sm:rounded-[1.75rem]"
    >
      <div className="relative">
        <ExerciseThumb slug={exercise.slug} className="aspect-[4/3]" />
        <span className="glass-hud absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
          {exercise.region}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <h3 className="display text-balance text-[15px] leading-[1.05] text-zinc-900 [text-shadow:0_1px_0_#fde68a] sm:text-lg">{exercise.name}</h3>
        <p className="truncate text-[11px] font-extrabold uppercase tabular-nums text-zinc-800 sm:text-xs">
          {sets ?? exercise.prescription.sets} × {shortReps(reps ?? exercise.prescription.reps)}
          {exercise.hold || /s\b|min|max|sec/i.test(reps ?? exercise.prescription.reps) ? "" : " reps"}
        </p>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {exercise.primary.map((m, i) => (
            <span
              key={m}
              className={`rounded-full bg-red-600/10 px-2 py-0.5 text-[10px] font-semibold text-red-700 sm:text-[11px] ${i > 1 ? "hidden sm:inline" : ""}`}
            >
              {MUSCLES[m].name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div>
        {kicker && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{kicker}</p>}
        <h2 className="display mt-1 text-3xl sm:text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/**
 * Horizontal, snap-scrolling row on phones (bleeds to the screen edges) that
 * becomes a normal grid from `md` up. Pass literal Tailwind classes so they're
 * picked up by the build.
 */
export function Carousel({
  children,
  item = "basis-[70%] sm:basis-[42%]",
  grid = "md:grid-cols-4",
  className = "",
}: {
  children: ReactNode;
  item?: string;
  grid?: string;
  className?: string;
}) {
  return (
    <div
      className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 no-scrollbar md:mx-0 md:grid md:gap-4 md:overflow-visible md:px-0 md:pb-0 ${grid} ${className}`}
    >
      {Children.map(children, (child) => (
        <div className={`shrink-0 snap-start ${item}`}>{child}</div>
      ))}
    </div>
  );
}
