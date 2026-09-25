import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BodyExplorer from "@/components/BodyExplorer";
import { ExerciseCard } from "@/components/ui";
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-zinc-400">
        <Link href="/muscles" className="hover:text-white">
          Muscles
        </Link>{" "}
        / {muscle.region}
      </nav>
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.2fr]">
        <BodyExplorer key={id} highlights={{ [id]: "primary" }} view={muscle.view} autoRotate={false} className="aspect-[4/5] w-full" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">{muscle.region}</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{muscle.name}</h1>
          <p className="mt-1 italic text-zinc-400">{muscle.latin}</p>
          <p className="mt-5 max-w-lg text-lg text-zinc-200">{muscle.function}</p>
          <p className="mt-5 text-sm text-zinc-400">
            {primary.length} exercise{primary.length === 1 ? "" : "s"} target it directly, {secondary.length} more work it as a
            helper.
          </p>
        </div>
      </div>

      {primary.length > 0 && (
        <section className="mt-12">
          <h2 className="display mb-5 text-3xl">Best exercises</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {primary.map((e) => (
              <ExerciseCard key={e.slug} exercise={e} />
            ))}
          </div>
        </section>
      )}
      {secondary.length > 0 && (
        <section className="mt-12">
          <h2 className="display mb-5 text-3xl text-zinc-400">Also works it</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.map((e) => (
              <ExerciseCard key={e.slug} exercise={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
