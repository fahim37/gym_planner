import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EquipmentCard from "@/components/EquipmentCard";
import { EquipmentFocusProvider } from "@/components/EquipmentFocus";
import { GLASS_CARD, GLASS_CHIP } from "@/components/EquipmentGlass";
import EquipmentPartList from "@/components/EquipmentPartList";
import EquipmentViewer from "@/components/EquipmentViewer";
import { ExerciseCard, MuscleChip } from "@/components/ui";
import { getEquipment, relatedEquipment, summarizeEquipment } from "@/data/equipment";
import { getExercise } from "@/data/exercises";
import { EQUIPMENT_CATALOG } from "@/lib/equipment-catalog";
import type { Exercise } from "@/lib/exercise-types";

export function generateStaticParams() {
  return EQUIPMENT_CATALOG.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/equipment/[slug]">): Promise<Metadata> {
  const e = getEquipment((await params).slug);
  return e ? { title: `${e.name} — how to use it`, description: e.summary } : {};
}

const h2 = "text-xs font-bold uppercase tracking-[0.2em] text-zinc-400";

function Steps({ steps, start = 1 }: { steps: string[]; start?: number }) {
  return (
    <ol className="mt-3 space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300 text-sm font-black text-zinc-900">
            {start + i}
          </span>
          <span className="pt-0.5 text-zinc-200">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function EquipmentDetailPage({ params }: PageProps<"/equipment/[slug]">) {
  const { slug } = await params;
  const e = getEquipment(slug);
  if (!e) notFound();
  const exercises = e.exercises.map(getExercise).filter((x): x is Exercise => !!x);
  const related = relatedEquipment(e);
  // Muscles are listed most-worked first: show the leaders as primary.
  const mainCount = Math.min(3, Math.ceil(e.musclesTrained.length / 2));

  return (
    <EquipmentFocusProvider key={e.slug}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <nav className="mb-4 text-sm text-zinc-400">
          <Link href="/equipment" className="hover:text-white">
            Equipment
          </Link>{" "}
          /{" "}
          <Link href={`/equipment?category=${e.categorySlug}`} className="hover:text-white">
            {e.category}
          </Link>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-10">
          <header className="lg:col-start-2 lg:row-start-1">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
              <Link href={`/equipment?category=${e.categorySlug}`} className={`rounded-full px-2.5 py-1 ${GLASS_CHIP}`}>
                {e.category}
              </Link>
              <span className={`rounded-full px-2.5 py-1 ${GLASS_CHIP}`}>{e.parts.length} parts</span>
              {exercises.length > 0 && (
                <span className="rounded-full bg-red-600/20 px-2.5 py-1 text-red-300 ring-1 ring-inset ring-red-400/30">
                  {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <h1 className="display mt-3 text-4xl sm:text-5xl">{e.name}</h1>
            {/* On phones the summary sits under the viewer, so the whole viewer fits the first screen. */}
            <p className="mt-3 hidden text-lg text-zinc-200 lg:block">{e.summary}</p>
          </header>

          <div className="min-w-0 lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <EquipmentViewer key={e.slug} slug={e.slug} name={e.name} parts={e.parts} className="w-full" />
          </div>

          <div className="min-w-0 lg:col-start-2">
            <p className="mb-3 text-lg text-zinc-200 lg:hidden">{e.summary}</p>
            <p className="text-zinc-400">{e.description}</p>

            <div className="mt-6 flex gap-3 rounded-2xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-zinc-200">
                <span className="font-bold text-amber-300">First time? </span>
                {e.beginnerTip}
              </p>
            </div>

            <h2 className={`mt-8 ${h2}`}>Parts · tap to see in 3D</h2>
            <div className="mt-3">
              <EquipmentPartList parts={e.parts} />
            </div>

            <h2 className={`mt-8 ${h2}`}>How to use it</h2>
            <h3 className="mt-4 text-sm font-bold text-white">Set up</h3>
            <Steps steps={e.howToUse.setup} />
            <h3 className="mt-6 text-sm font-bold text-white">Use it</h3>
            <Steps steps={e.howToUse.use} start={e.howToUse.setup.length + 1} />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/30">
                <h3 className="text-sm font-bold text-emerald-300">✓ Stay safe</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  {e.safety.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-400/30">
                <h3 className="text-sm font-bold text-red-300">✗ Common mistakes</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  {e.commonMistakes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>

            {e.specs && e.specs.length > 0 && (
              <>
                <h2 className={`mt-8 ${h2}`}>Specs</h2>
                <dl className={`mt-3 divide-y divide-white/10 overflow-hidden rounded-[1.4rem] ${GLASS_CARD}`}>
                  {e.specs.map((s) => (
                    <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:w-36 sm:shrink-0 sm:pt-0.5">{s.label}</dt>
                      <dd className="text-sm font-semibold text-zinc-100">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <h2 className={`mt-8 ${h2}`}>Muscles trained</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.musclesTrained.map((m, i) => (
                <MuscleChip key={m} id={m} emphasis={i < mainCount ? "primary" : "secondary"} />
              ))}
            </div>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="display mb-5 text-3xl">Exercises using this</h2>
          {exercises.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {exercises.map((x) => (
                <ExerciseCard key={x.slug} exercise={x} />
              ))}
            </div>
          ) : (
            <div className={`rounded-[1.75rem] p-5 sm:p-6 ${GLASS_CARD}`}>
              <p className="font-semibold text-white">No animated exercises for the {e.name.toLowerCase()} in our library yet.</p>
              <p className="mt-1 text-sm text-zinc-400">
                Follow the set-up and how-to steps above, and ask a coach on the gym floor for a quick demo on your first go.
              </p>
              {e.starterWorkout && (
                <p className="mt-4 rounded-2xl bg-amber-300/10 p-4 text-sm text-zinc-200 ring-1 ring-amber-300/30">
                  <span className="font-bold text-amber-300">Try this: </span>
                  {e.starterWorkout}
                </p>
              )}
              <Link
                href="/exercises"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-amber-300 px-5 text-sm font-bold text-zinc-900 hover:bg-amber-200"
              >
                Browse all exercises →
              </Link>
            </div>
          )}
        </section>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="display mb-5 text-3xl">More {e.category.toLowerCase()}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {related.map((r) => (
                <EquipmentCard key={r.slug} item={summarizeEquipment(r)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </EquipmentFocusProvider>
  );
}
