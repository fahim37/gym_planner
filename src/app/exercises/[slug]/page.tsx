import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExerciseViewer from "@/components/ExerciseViewer";
import { ExerciseCard, MuscleChip } from "@/components/ui";
import { EXERCISES, getExercise } from "@/data/exercises";
import { programsUsing, relatedExercises } from "@/lib/queries";

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/exercises/[slug]">): Promise<Metadata> {
  const e = getExercise((await params).slug);
  return e ? { title: e.name, description: e.summary } : {};
}

export default async function ExercisePage({ params }: PageProps<"/exercises/[slug]">) {
  const { slug } = await params;
  const e = getExercise(slug);
  if (!e) notFound();
  const related = relatedExercises(e);
  const programs = programsUsing(e.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-zinc-400">
        <Link href="/exercises" className="hover:text-white">
          Exercises
        </Link>{" "}
        /{" "}
        <Link href={`/exercises?region=${e.region}`} className="hover:text-white">
          {e.region}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ExerciseViewer
            animation={e.animation}
            primary={e.primary}
            secondary={e.secondary}
            hold={e.hold}
            className="aspect-square w-full"
          />
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" /> Target
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-300" /> Secondary
            </span>
            <span>Drag to rotate</span>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">{e.level}</span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">{e.mechanics}</span>
            {e.equipment.map((q) => (
              <span key={q} className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                {q}
              </span>
            ))}
          </div>
          <h1 className="display mt-3 text-4xl sm:text-5xl">{e.name}</h1>
          <p className="mt-3 text-zinc-300">{e.summary}</p>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Sets", value: e.prescription.sets },
              { label: e.hold ? "Hold" : "Reps", value: e.prescription.reps },
              { label: "Rest", value: e.prescription.rest },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-white/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</div>
                <div className="mt-1 text-lg font-black leading-tight text-amber-300">{s.value}</div>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Muscles worked</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {e.primary.map((m) => (
              <MuscleChip key={m} id={m} emphasis="primary" />
            ))}
            {e.secondary.map((m) => (
              <MuscleChip key={m} id={m} emphasis="secondary" />
            ))}
          </div>

          <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">How to do it</h2>
          <ol className="mt-3 space-y-3">
            {e.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300 text-sm font-black text-zinc-900">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-zinc-200">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/30">
              <h3 className="text-sm font-bold text-emerald-300">✓ Pro tips</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                {e.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-400/30">
              <h3 className="text-sm font-bold text-red-300">✗ Common mistakes</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                {e.mistakes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-sky-500/10 p-4 text-sm text-zinc-300 ring-1 ring-sky-400/30">
            <span className="font-bold text-sky-300">Breathing: </span>
            {e.breathing}
          </div>

          {programs.length > 0 && (
            <p className="mt-6 text-sm text-zinc-400">
              Part of:{" "}
              {programs.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && ", "}
                  <Link href={`/programs/${p.slug}`} className="font-semibold text-amber-300 hover:underline">
                    {p.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-5 text-3xl">Also try</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ExerciseCard key={r.slug} exercise={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
