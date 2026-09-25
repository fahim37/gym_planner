import Link from "next/link";
import BodyExplorer from "@/components/BodyExplorer";
import { ExerciseCard, SectionTitle } from "@/components/ui";
import { SITE } from "@/config/site";
import { EXERCISES, getExercise } from "@/data/exercises";
import { PROGRAMS } from "@/data/programs";
import { REGIONS } from "@/lib/muscles";

const FEATURED = ["barbell-back-squat", "bent-over-barbell-row", "barbell-bench-press", "dumbbell-alternate-biceps-curl"];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">{SITE.gym} workout guide</p>
          <h1 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">
            See every rep.
            <br />
            <span className="text-red-500">Know every muscle.</span>
          </h1>
          <p className="mt-5 max-w-md text-zinc-300">
            {EXERCISES.length} exercises animated in 3D. Watch the exact movement from any angle, see the target muscles light
            up in red, then follow a program with sets, reps and rest timers.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/exercises" className="rounded-full bg-amber-300 px-6 py-3 font-bold text-zinc-900 hover:bg-amber-200">
              Browse exercises
            </Link>
            <Link href="/programs" className="rounded-full border border-white/20 px-6 py-3 font-bold hover:bg-white/10">
              Start a program
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-5 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" /> Target muscle
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-300" /> Also working
            </span>
          </div>
        </div>
        <BodyExplorer className="aspect-[4/5] w-full md:aspect-[5/6]" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle kicker="Train by body part" title="What are we hitting today?" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {REGIONS.map((region) => {
            const count = EXERCISES.filter((e) => e.region === region).length;
            return (
              <Link
                key={region}
                href={`/exercises?region=${region}`}
                className="group rounded-2xl border border-white/10 bg-zinc-900 p-4 transition hover:border-red-500/60 hover:bg-zinc-800"
              >
                <div className="display text-2xl group-hover:text-red-400">{region}</div>
                <div className="mt-1 text-xs text-zinc-400">{count} exercises</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle kicker="Follow a plan" title="Programs">
          <Link href="/programs" className="text-sm font-semibold text-amber-300 hover:underline">
            All programs →
          </Link>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMS.map((p) => (
            <Link key={p.slug} href={`/programs/${p.slug}`} className="group relative overflow-hidden rounded-3xl bg-zinc-900 p-5 ring-1 ring-white/10 hover:ring-white/30">
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${p.accent}`} />
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {p.level} · {p.daysPerWeek}×/week
              </div>
              <div className="display mt-2 text-2xl">{p.name}</div>
              <p className="mt-2 text-sm text-zinc-400">{p.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle kicker="Most popular" title="Master the basics">
          <Link href="/exercises" className="text-sm font-semibold text-amber-300 hover:underline">
            All exercises →
          </Link>
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED.map((slug) => (
            <ExerciseCard key={slug} exercise={getExercise(slug)!} />
          ))}
        </div>
      </section>
    </>
  );
}
