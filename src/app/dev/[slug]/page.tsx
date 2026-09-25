import { notFound } from "next/navigation";
import { EXERCISES } from "@/data/exercises";
import DevFrames from "./DevFrames";

/**
 * Pose-authoring aid (dev server only): every keyframe of one exercise,
 * frozen, from its camera preset and from the side. Visit /dev/<slug>.
 */
export default async function DevPage({ params }: PageProps<"/dev/[slug]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  const exercise = EXERCISES.find((e) => e.slug === slug);
  if (!exercise) notFound();
  return <DevFrames slug={slug} />;
}
