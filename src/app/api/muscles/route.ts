import { MUSCLES } from "@/lib/muscles";
import { exercisesForMuscle } from "@/lib/queries";

/** GET /api/muscles — every muscle with the exercises that target it. */
export function GET() {
  return Response.json(
    Object.values(MUSCLES).map((m) => {
      const { primary, secondary } = exercisesForMuscle(m.id);
      return { ...m, primaryExercises: primary.map((e) => e.slug), secondaryExercises: secondary.map((e) => e.slug) };
    }),
  );
}
