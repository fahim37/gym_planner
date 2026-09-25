import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExerciseViewer from "@/components/ExerciseViewer";
import { ChevronRight, DumbbellIcon, MachineIcon, MatIcon, RackIcon, ClockIcon } from "@/components/icons";
import ShareButton from "@/components/ShareButton";
import { Carousel, ExerciseCard } from "@/components/ui";
import { EXERCISES, getExercise } from "@/data/exercises";
import { equipmentForExercise, type EquipmentCategory } from "@/lib/equipment-catalog";
import { programsUsing, relatedExercises } from "@/lib/queries";
import ExerciseDetails from "./ExerciseDetails";

const CATEGORY_ICON: Record<EquipmentCategory, typeof DumbbellIcon> = {
  "Free weights": DumbbellIcon,
  "Benches & racks": RackIcon,
  Machines: MachineIcon,
  Cardio: ClockIcon,
  Accessories: MatIcon,
};

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
  const gear = equipmentForExercise(e.slug);

  return (
    <div className="mx-auto max-w-6xl lg:px-4 lg:py-8">
      <nav className="mb-4 hidden text-sm text-zinc-400 lg:block">
        <Link href="/exercises" className="hover:text-white">
          Exercises
        </Link>{" "}
        /{" "}
        <Link href={`/exercises?region=${e.region}`} className="hover:text-white">
          {e.region}
        </Link>
      </nav>

      <div className="lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-8">
        {/* Phones: full-bleed player on top. Desktop: sticky beside the instructions. */}
        <div className="px-2 pt-2 sm:px-4 sm:pt-4 lg:sticky lg:top-[calc(var(--header-offset)+1.25rem)] lg:self-start lg:p-0">
          <ExerciseViewer
            animation={e.animation}
            primary={e.primary}
            secondary={e.secondary}
            hold={e.hold}
            className="h-[clamp(24rem,62svh,40rem)] w-full lg:aspect-square lg:h-auto"
          />
          <div className="mt-3 flex items-center justify-center gap-5 px-4 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" /> Target
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-300" /> Secondary
            </span>
            <span className="hidden sm:inline">Drag to rotate · tap a muscle</span>
          </div>
        </div>

        <div className="px-4 pt-5 lg:px-0 lg:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="glass-chip rounded-full px-2.5 py-1 text-zinc-200">{e.level}</span>
              <span className="glass-chip rounded-full px-2.5 py-1 text-zinc-200">{e.mechanics}</span>
              {e.equipment.map((q) => (
                <span key={q} className="glass-chip rounded-full px-2.5 py-1 text-zinc-200">
                  {q}
                </span>
              ))}
            </div>
            <ShareButton title={e.name} text={e.summary} className="-mt-1.5" />
          </div>
          <h1 className="display mt-3 text-4xl sm:text-5xl">{e.name}</h1>
          <p className="mt-3 text-zinc-300">{e.summary}</p>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Sets", value: e.prescription.sets },
              { label: e.hold ? "Hold" : "Reps", value: e.prescription.reps },
              { label: "Rest", value: e.prescription.rest },
            ].map((s) => (
              <div key={s.label} className="surface rounded-[1.25rem] p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</div>
                <div className="mt-1 text-lg font-black leading-tight text-amber-300">{s.value}</div>
              </div>
            ))}
          </div>

          {gear.length > 0 && (
            <section className="mt-7">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Equipment you&apos;ll need</h2>
              <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0">
                {gear.map((g) => {
                  const Icon = CATEGORY_ICON[g.category];
                  return (
                    <Link
                      key={g.slug}
                      href={`/equipment/${g.slug}`}
                      className="surface flex min-h-14 shrink-0 snap-start items-center gap-3 rounded-[1.25rem] py-2 pl-2 pr-3 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-[0.96]"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-[0.8rem] bg-amber-300/15 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        <Icon size={22} />
                      </span>
                      <span>
                        <span className="block whitespace-nowrap text-sm font-bold">{g.name}</span>
                        <span className="block text-[11px] text-zinc-500">{g.category}</span>
                      </span>
                      <ChevronRight size={16} className="text-zinc-500" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <ExerciseDetails
            steps={e.steps}
            tips={e.tips}
            mistakes={e.mistakes}
            breathing={e.breathing}
            primary={e.primary}
            secondary={e.secondary}
          />

          {programs.length > 0 && (
            <div className="mt-7">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Part of these programs</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {programs.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/programs/${p.slug}`}
                    className="glass-chip flex h-10 items-center gap-1 rounded-full pl-4 pr-2.5 text-sm font-semibold text-amber-300 transition-transform duration-300 ease-spring active:scale-90"
                  >
                    {p.name}
                    <ChevronRight size={16} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 px-4 lg:mt-14 lg:px-0">
          <h2 className="display mb-5 text-3xl">Also try</h2>
          <Carousel item="basis-[46%] sm:basis-[31%]">
            {related.map((r) => (
              <ExerciseCard key={r.slug} exercise={r} />
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
