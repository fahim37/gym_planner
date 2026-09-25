import Link from "next/link";
import BodyExplorer from "@/components/BodyExplorer";
import ContinueCard from "@/components/ContinueCard";
import { ChevronRight } from "@/components/icons";
import { Carousel, ExerciseCard, SectionTitle } from "@/components/ui";
import { SITE } from "@/config/site";
import { EXERCISES, getExercise } from "@/data/exercises";
import { PROGRAMS } from "@/data/programs";
import { REGIONS } from "@/lib/muscles";

const FEATURED = ["barbell-back-squat", "bent-over-barbell-row", "barbell-bench-press", "dumbbell-alternate-biceps-curl"];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-4 pb-6 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-8 md:py-16">
        <div className="animate-rise">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">{SITE.gym} workout guide</p>
          <h1 className="display mt-3 text-[2.75rem] sm:text-6xl lg:text-7xl">
            See every rep.
            <br />
            <span className="text-red-500">Know every muscle.</span>
          </h1>
          <p className="mt-4 max-w-md text-zinc-300 md:mt-5">
            {EXERCISES.length} exercises animated in 3D. Watch the exact movement from any angle, see the target muscles light
            up in red, then follow a program with sets, reps and rest timers.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap md:mt-7">
            <Link
              href="/exercises"
              className="glass-reactive flex h-12 items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-amber-300 px-4 text-[15px] font-bold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_-8px_rgba(252,211,77,0.6)] transition-transform duration-300 ease-spring hover:bg-amber-200 active:scale-95 sm:px-6 sm:text-base"
            >
              Browse exercises
            </Link>
            <Link
              href="/programs"
              className="glass glass-reactive flex h-12 items-center justify-center overflow-hidden whitespace-nowrap rounded-full px-4 text-[15px] font-bold transition-transform duration-300 ease-spring active:scale-95 sm:px-6 sm:text-base"
            >
              Start a program
            </Link>
          </div>
          <ContinueCard className="mt-5" />
          <div className="mt-6 hidden items-center gap-5 text-xs text-zinc-400 md:mt-8 md:flex">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" /> Target muscle
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-300" /> Also working
            </span>
          </div>
        </div>
        <BodyExplorer className="aspect-[5/6] w-full md:aspect-[5/6]" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <SectionTitle kicker="Train by body part" title="What are we hitting today?" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {REGIONS.map((region) => {
            const count = EXERCISES.filter((e) => e.region === region).length;
            return (
              <Link
                key={region}
                href={`/exercises?region=${region}`}
                className="surface group rounded-[1.25rem] p-3 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-95 sm:p-4"
              >
                <div className="display text-[15px] group-hover:text-red-400 sm:text-2xl">{region}</div>
                <div className="mt-1 text-[11px] text-zinc-400 sm:text-xs">{count} exercises</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <SectionTitle kicker="Follow a plan" title="Programs">
          <Link href="/programs" className="-mr-2 flex h-11 min-w-11 items-center justify-center gap-0.5 px-2 text-sm font-semibold text-amber-300 hover:underline">
            All <ChevronRight size={16} />
          </Link>
        </SectionTitle>
        <Carousel item="basis-[78%] sm:basis-[45%]" grid="md:grid-cols-2 lg:grid-cols-4">
          {PROGRAMS.map((p) => (
            <Link
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="surface group relative flex h-full min-h-40 flex-col overflow-hidden rounded-[1.75rem] p-5 transition-transform duration-300 ease-spring hover:bg-white/[0.07] active:scale-[0.97]"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${p.accent}`} />
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {p.level} · {p.daysPerWeek}×/week
              </div>
              <div className="display mt-2 text-2xl">{p.name}</div>
              <p className="mt-2 text-sm text-zinc-400">{p.tagline}</p>
              <div className="mt-auto flex items-center gap-1 pt-4 text-xs font-bold text-amber-300">
                {p.days.length} workouts <ChevronRight size={14} />
              </div>
            </Link>
          ))}
        </Carousel>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <SectionTitle kicker="Most popular" title="Master the basics">
          <Link href="/exercises" className="-mr-2 flex h-11 min-w-11 items-center justify-center gap-0.5 px-2 text-sm font-semibold text-amber-300 hover:underline">
            All <ChevronRight size={16} />
          </Link>
        </SectionTitle>
        <Carousel item="basis-[58%] sm:basis-[40%]" grid="md:grid-cols-2 lg:grid-cols-4">
          {FEATURED.map((slug) => (
            <ExerciseCard key={slug} exercise={getExercise(slug)!} />
          ))}
        </Carousel>
      </section>
    </>
  );
}
