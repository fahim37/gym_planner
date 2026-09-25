import type { NextRequest } from "next/server";
import { getExercise } from "@/data/exercises";

/** GET /api/exercises/:slug — full exercise, including instructions and keyframes. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/exercises/[slug]">) {
  const { slug } = await ctx.params;
  const exercise = getExercise(slug);
  if (!exercise) return Response.json({ error: "Exercise not found" }, { status: 404 });
  return Response.json(exercise);
}
