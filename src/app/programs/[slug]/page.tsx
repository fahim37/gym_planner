import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram, PROGRAMS } from "@/data/programs";
import ProgramDays from "./ProgramDays";

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/programs/[slug]">): Promise<Metadata> {
  const p = getProgram((await params).slug);
  return p ? { title: p.name, description: p.tagline } : {};
}

export default async function ProgramPage({ params }: PageProps<"/programs/[slug]">) {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-zinc-400">
        <Link href="/programs" className="hover:text-white">
          Programs
        </Link>
      </nav>
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 p-6 ring-1 ring-white/10 sm:p-8">
        <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${program.accent}`} />
        <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          <span>{program.level}</span>·<span>{program.daysPerWeek}× per week</span>·<span>{program.equipment}</span>
        </div>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{program.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">{program.description}</p>
      </div>
      <ProgramDays program={program} />
    </div>
  );
}
