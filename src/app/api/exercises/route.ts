import type { NextRequest } from "next/server";
import type { Equipment, Level } from "@/lib/exercise-types";
import { isMuscleId, REGIONS, type BodyRegion } from "@/lib/muscles";
import { findExercises, summarize } from "@/lib/queries";

/**
 * GET /api/exercises?q=&region=&muscle=&equipment=&level=
 * Lists exercises (without animation data) matching every given filter.
 */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const muscle = p.get("muscle") ?? undefined;
  const region = p.get("region") ?? undefined;
  if (muscle && !isMuscleId(muscle)) {
    return Response.json({ error: `Unknown muscle "${muscle}"` }, { status: 400 });
  }
  if (region && !REGIONS.includes(region as BodyRegion)) {
    return Response.json({ error: `Unknown region "${region}"` }, { status: 400 });
  }
  const results = findExercises({
    q: p.get("q") ?? undefined,
    region: region as BodyRegion | undefined,
    muscle: muscle && isMuscleId(muscle) ? muscle : undefined,
    equipment: (p.get("equipment") as Equipment | null) ?? undefined,
    level: (p.get("level") as Level | null) ?? undefined,
  });
  return Response.json({ count: results.length, exercises: results.map(summarize) });
}
