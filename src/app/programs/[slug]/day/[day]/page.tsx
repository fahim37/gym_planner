import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProgram, PROGRAMS } from "@/data/programs";
import WorkoutPlayer from "./WorkoutPlayer";

export function generateStaticParams() {
  return PROGRAMS.flatMap((p) => p.days.map((_, i) => ({ slug: p.slug, day: String(i + 1) })));
}

export async function generateMetadata({ params }: PageProps<"/programs/[slug]/day/[day]">): Promise<Metadata> {
  const { slug, day } = await params;
  const p = getProgram(slug);
  return p ? { title: `${p.name} — ${p.days[Number(day) - 1]?.title ?? ""}` } : {};
}

export default async function WorkoutPage({ params }: PageProps<"/programs/[slug]/day/[day]">) {
  const { slug, day } = await params;
  const program = getProgram(slug);
  const n = Number(day);
  if (!program || !Number.isInteger(n) || n < 1 || n > program.days.length) notFound();
  return <WorkoutPlayer program={program} day={n} />;
}
