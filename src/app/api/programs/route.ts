import { PROGRAMS } from "@/data/programs";

/** GET /api/programs — all programs with their daily workouts. */
export function GET() {
  return Response.json(PROGRAMS);
}
