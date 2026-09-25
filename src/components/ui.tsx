import Link from "next/link";
import type { Exercise } from "@/lib/exercise-types";
import { MUSCLES, type MuscleId } from "@/lib/muscles";
import ExerciseThumb from "./ExerciseThumb";

export function MuscleChip({ id, emphasis }: { id: MuscleId; emphasis: "primary" | "secondary" }) {
  return (
    <Link
      href={`/muscles/${id}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition hover:brightness-110 ${
        emphasis === "primary" ? "bg-red-600 text-white" : "bg-orange-300/20 text-orange-200 ring-1 ring-orange-300/40"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${emphasis === "primary" ? "bg-white" : "bg-orange-300"}`} />
      {MUSCLES[id].name}
    </Link>
  );
}

/** Card in the style of a workout poster: 3D still, bold name, reps and sets. */
export function ExerciseCard({ exercise, sets, reps }: { exercise: Exercise; sets?: string; reps?: string }) {
  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white text-zinc-900 shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative">
        <ExerciseThumb slug={exercise.slug} className="aspect-[4/3]" />
        <span className="absolute left-3 top-3 rounded-full bg-zinc-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          {exercise.region}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="display text-lg text-zinc-900 [text-shadow:0_1px_0_#fde68a]">{exercise.name}</h3>
        <div className="flex gap-3 text-xs font-extrabold uppercase text-zinc-800">
          <span>{reps ?? exercise.prescription.reps} {exercise.hold ? "" : "reps"}</span>
          <span className="text-zinc-400">·</span>
          <span>{sets ?? exercise.prescription.sets} sets</span>
        </div>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {exercise.primary.map((m) => (
            <span key={m} className="rounded-full bg-red-600/10 px-2 py-0.5 text-[11px] font-semibold text-red-700">
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{kicker}</p>}
        <h2 className="display mt-1 text-3xl sm:text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}
