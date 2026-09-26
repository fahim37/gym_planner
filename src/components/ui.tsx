import Link from "next/link";
import { Children, type ReactNode } from "react";
import type { Exercise } from "@/lib/exercise-types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import ExerciseThumb from "./ExerciseThumb";
import { CheckIcon, ChevronRight, CloseIcon } from "./icons";

export function MuscleChip({ id, emphasis }: { id: MuscleId; emphasis: "primary" | "secondary" }) {
  return (
    <Link
      href={`/muscles/${id}`}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-semibold transition-transform duration-300 ease-spring hover:brightness-110 active:scale-90 ${
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
  const r = reps ?? exercise.prescription.reps;
  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="@container group flex h-full flex-col overflow-hidden rounded-[1.4rem] bg-white text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_18px_40px_-18px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-spring hover:-translate-y-1 active:scale-[0.96] sm:rounded-[1.75rem]"
    >
      <div className="relative">
        <ExerciseThumb slug={exercise.slug} className="aspect-[4/3]" />
        <span className="glass-hud absolute left-2 top-2 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wider sm:left-3 sm:top-3 sm:px-2.5 sm:py-1">
          {exercise.region}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        {/* Sized to the card, so long names stay whole in narrow grid and carousel cards. */}
        <h3 className="display text-balance text-[clamp(0.9375rem,9.6cqi,1.125rem)] leading-[1.05] text-zinc-900 [text-shadow:0_1px_0_#fde68a]">
          {exercise.name}
        </h3>
        <p className="line-clamp-2 text-xs font-extrabold uppercase leading-snug tabular-nums text-zinc-700 sm:text-meta">
          {sets ?? exercise.prescription.sets} × {shortReps(r)}
          {exercise.hold || /s\b|min|max|sec/i.test(r) ? "" : " reps"}
        </p>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {exercise.primary.map((m, i) => (
            <span
              key={m}
              className={`rounded-full bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-700 ${i > 1 ? "hidden sm:inline" : ""}`}
            >
              {MUSCLES[m].name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

/** Page or section title with an eyebrow kicker; `children` (e.g. an "All ›" link) sits on the right. */
export function SectionTitle({
  kicker,
  title,
  as: Heading = "h2",
  children,
}: {
  kicker?: string;
  title: string;
  /** List pages use their title as the page's h1. */
  as?: "h1" | "h2";
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        {kicker && <p className="eyebrow text-amber-300">{kicker}</p>}
        <Heading className="display mt-1.5 text-[2rem] sm:text-4xl">{title}</Heading>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/** "All ›" link beside a section title. */
export function SeeAll({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-mr-2 flex h-11 items-center gap-0.5 rounded-full px-3 text-sm font-semibold text-amber-300 transition-transform duration-300 ease-spring hover:bg-white/5 active:scale-95"
    >
      {label} <ChevronRight size={16} />
    </Link>
  );
}

/** Small uppercase facts about something (level, days per week, equipment…), as wrapping badges. */
export function MetaBadges({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="glass-chip rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-zinc-200">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Tinted note list: pro tips / safety (good) or common mistakes (bad), one marker per line. */
export function NoteList({ tone, title, items }: { tone: "good" | "bad"; title: string; items: string[] }) {
  const good = tone === "good";
  return (
    <div className={`rounded-[1.25rem] p-4 ring-1 ${good ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-red-500/10 ring-red-400/30"}`}>
      <h3 className={`text-base font-bold ${good ? "text-emerald-300" : "text-red-300"}`}>{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-md text-zinc-200">
            <span
              aria-hidden
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                good ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"
              }`}
            >
              {good ? <CheckIcon size={12} strokeWidth={3} /> : <CloseIcon size={12} strokeWidth={3} />}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Numbered how-to steps with amber beads. */
export function Steps({ steps, start = 1 }: { steps: string[]; start?: number }) {
  return (
    <ol className="space-y-3.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300 text-sm font-black tabular-nums text-zinc-900">
            {start + i}
          </span>
          <span className="pt-0.5 leading-relaxed text-zinc-100">{step}</span>
        </li>
      ))}
    </ol>
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
