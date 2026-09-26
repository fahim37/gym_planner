import type { Exercise } from "@/lib/exercise-types";
import { MUSCLES } from "@/lib/muscles";

/** The Gemini embedding model and size the committed vectors were built with. */
export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIMS = 256;

/** The text an exercise is embedded as: what it is, what it trains, with what, and for whom. */
export function exerciseDocument(e: Exercise): string {
  const names = (ids: Exercise["primary"]) => ids.map((m) => MUSCLES[m].name).join(", ");
  return [
    `${e.name}.`,
    e.summary,
    `Body part: ${e.region}. Targets: ${names(e.primary)}.${e.secondary.length ? ` Also works: ${names(e.secondary)}.` : ""}`,
    `Equipment: ${e.equipment.join(", ")}. ${e.category ?? "Strength"}, ${e.mechanics.toLowerCase()}, ${e.level.toLowerCase()} level.`,
    `How: ${e.steps.slice(0, 3).join(" ")}`,
    `Tips: ${e.tips.join(" ")}`,
  ].join("\n");
}
