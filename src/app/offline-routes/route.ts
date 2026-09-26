import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT } from "@/data/equipment";
import { PROGRAMS } from "@/data/programs";
import { MUSCLE_IDS } from "@/lib/muscles";

/** Every page of the app, for the service worker to save for offline use (public/sw.js). */
export const dynamic = "force-static";

export function GET() {
  const routes = [
    "/",
    "/exercises",
    "/muscles",
    "/equipment",
    "/programs",
    ...EXERCISES.map((e) => `/exercises/${e.slug}`),
    ...MUSCLE_IDS.map((id) => `/muscles/${id}`),
    ...EQUIPMENT.map((e) => `/equipment/${e.slug}`),
    ...PROGRAMS.flatMap((p) => [`/programs/${p.slug}`, ...p.days.map((_, i) => `/programs/${p.slug}/day/${i + 1}`)]),
    "/icon/small",
    "/icon/large",
    "/icon/maskable",
    "/apple-icon",
    "/manifest.webmanifest",
  ];
  return Response.json({ routes });
}
