import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EquipmentCard from "@/components/EquipmentCard";
import { EquipmentFocusProvider } from "@/components/EquipmentFocus";
import { GLASS_CHIP, SURFACE } from "@/components/EquipmentGlass";
import EquipmentPartList from "@/components/EquipmentPartList";
import EquipmentViewer from "@/components/EquipmentViewer";
import { ExerciseCard, MuscleChip, NoteList, Steps } from "@/components/ui";
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

const h2 = "section-label";

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
        <nav className="mb-4 hidden text-sm text-zinc-400 md:block">
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
            <div className="flex flex-wrap items-center gap-2 text-2xs font-bold uppercase tracking-wider">
              <Link
                href={`/equipment?category=${e.categorySlug}`}
                className={`hit inline-flex items-center rounded-full px-2.5 py-1 ${GLASS_CHIP}`}
              >
                {e.category} ›
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
            <p className="mt-3 hidden text-lg leading-relaxed text-zinc-200 lg:block">{e.summary}</p>
          </header>

          <div className="min-w-0 lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <EquipmentViewer key={e.slug} slug={e.slug} name={e.name} parts={e.parts} className="w-full" />
          </div>

          <div className="min-w-0 lg:col-start-2">
            <p className="mb-3 text-[1.0625rem] leading-relaxed text-zinc-200 lg:hidden">{e.summary}</p>
            <p className="leading-relaxed text-zinc-300">{e.description}</p>

            <div className="mt-6 flex gap-3 rounded-[1.25rem] bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-md text-zinc-200">
                <span className="font-bold text-amber-300">First time? </span>
                {e.beginnerTip}
              </p>
            </div>

            <h2 className={`mt-8 ${h2}`}>Parts · tap to see in 3D</h2>
            <div className="mt-3">
              <EquipmentPartList parts={e.parts} />
            </div>

            <h2 className={`mt-8 ${h2}`}>How to use it</h2>
            <h3 className="mb-3 mt-4 text-lg font-bold text-white">Set up</h3>
            <Steps steps={e.howToUse.setup} />
            <h3 className="mb-3 mt-6 text-lg font-bold text-white">Use it</h3>
            <Steps steps={e.howToUse.use} start={e.howToUse.setup.length + 1} />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <NoteList tone="good" title="Stay safe" items={e.safety} />
              <NoteList tone="bad" title="Common mistakes" items={e.commonMistakes} />
            </div>

            {e.specs && e.specs.length > 0 && (
              <>
                <h2 className={`mt-8 ${h2}`}>Specs</h2>
                <dl className={`mt-3 divide-y divide-white/10 overflow-hidden rounded-[1.4rem] ${SURFACE}`}>
                  {e.specs.map((s) => (
                    <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400 sm:w-36 sm:shrink-0 sm:pt-0.5">{s.label}</dt>
                      <dd className="text-md font-semibold text-zinc-100">{s.value}</dd>
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {exercises.map((x) => (
                <ExerciseCard key={x.slug} exercise={x} />
              ))}
            </div>
          ) : (
            <div className={`rounded-[1.75rem] p-5 sm:p-6 ${SURFACE}`}>
              <p className="font-semibold text-white">No animated exercises for the {e.name.toLowerCase()} in our library yet.</p>
              <p className="mt-1 text-md text-zinc-400">
                Follow the set-up and how-to steps above, and ask a coach on the gym floor for a quick demo on your first go.
              </p>
              {e.starterWorkout && (
                <p className="mt-4 rounded-[1.25rem] bg-amber-300/10 p-4 text-md text-zinc-200 ring-1 ring-amber-300/30">
                  <span className="font-bold text-amber-300">Try this: </span>
                  {e.starterWorkout}
                </p>
              )}
              <Link
                href="/exercises"
                className="mt-4 inline-flex h-12 items-center gap-1 rounded-full bg-amber-300 px-5 text-base font-bold text-zinc-900 transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-95"
              >
                Browse all exercises <span aria-hidden>→</span>
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
