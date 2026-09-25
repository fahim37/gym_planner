import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BodyExplorer from "@/components/BodyExplorer";
import { Carousel, ExerciseCard } from "@/components/ui";
import { exercisesForMuscle } from "@/lib/queries";
import { isMuscleId, MUSCLE_IDS, MUSCLES } from "@/lib/muscles";

export function generateStaticParams() {
  return MUSCLE_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/muscles/[id]">): Promise<Metadata> {
  const { id } = await params;
  return isMuscleId(id) ? { title: `${MUSCLES[id].name} exercises` } : {};
}

export default async function MusclePage({ params }: PageProps<"/muscles/[id]">) {
  const { id } = await params;
  if (!isMuscleId(id)) notFound();
  const muscle = MUSCLES[id];
  const { primary, secondary } = exercisesForMuscle(id);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 md:py-8">
      <nav className="mb-4 hidden text-sm text-zinc-400 md:block">
        <Link href="/muscles" className="hover:text-white">
          Muscles
        </Link>{" "}
        / {muscle.region}
      </nav>
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_1.2fr] md:gap-8">
        <BodyExplorer
          key={id}
          highlights={{ [id]: "primary" }}
          view={muscle.view}
          autoRotate={false}
          className="aspect-square w-full md:aspect-[4/5]"
        />
        <div className="animate-rise">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">{muscle.region}</p>
          <h1 className="display mt-2 text-[2.75rem] sm:text-6xl">{muscle.name}</h1>
          <p className="mt-1 italic text-zinc-400">{muscle.latin}</p>
          <p className="mt-4 max-w-lg text-lg text-zinc-200 md:mt-5">{muscle.function}</p>
          <p className="mt-5 text-sm text-zinc-400">
            {primary.length} exercise{primary.length === 1 ? "" : "s"} target it directly, {secondary.length} more work it as a
            helper.
          </p>
        </div>
      </div>

      {primary.length > 0 && (
        <section className="mt-10 md:mt-12">
          <h2 className="display mb-5 text-3xl">Best exercises</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {primary.map((e) => (
              <ExerciseCard key={e.slug} exercise={e} />
            ))}
          </div>
        </section>
      )}
      {secondary.length > 0 && (
        <section className="mt-10 md:mt-12">
          <h2 className="display mb-5 text-3xl text-zinc-400">Also works it</h2>
          <Carousel item="basis-[46%] sm:basis-[31%]">
            {secondary.map((e) => (
              <ExerciseCard key={e.slug} exercise={e} />
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
