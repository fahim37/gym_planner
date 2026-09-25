import type { EquipmentCategory, EquipmentEntry, EquipmentPartRef, EquipmentSlug } from "@/lib/equipment-catalog";
import type { MuscleId } from "@/lib/muscles";

export interface EquipmentSpec {
  label: string;
  value: string;
}

/** Hand-written guide content for one catalogue entry (src/data/equipment.ts). */
export interface EquipmentContent {
  /** One line for cards and meta descriptions. */
  summary: string;
  description: string;
  howToUse: {
    /** Getting the equipment ready: adjustments, loading, positioning. */
    setup: string[];
    /** Using it: the movement or session itself. */
    use: string[];
  };
  safety: string[];
  commonMistakes: string[];
  /** Most-worked first. */
  musclesTrained: MuscleId[];
  specs?: EquipmentSpec[];
  beginnerTip: string;
  /** What each part is for, keyed by the catalogue part id. */
  parts: Record<string, string>;
  /** A simple session idea, for equipment without library exercises. */
  starterWorkout?: string;
}

export interface EquipmentPart extends EquipmentPartRef {
  description: string;
}

/** A catalogue entry merged with its guide content: what pages and the API serve. */
export interface EquipmentInfo extends Omit<EquipmentEntry, "slug" | "parts" | "exercises">, Omit<EquipmentContent, "parts"> {
  slug: EquipmentSlug;
  categorySlug: string;
  parts: EquipmentPart[];
  /** Slugs of library exercises that use this equipment. */
  exercises: string[];
}

/** List view / API summary: no long-form instructions. */
export type EquipmentSummary = Pick<
  EquipmentInfo,
  "slug" | "name" | "category" | "categorySlug" | "summary" | "musclesTrained" | "exercises"
> & { parts: EquipmentPartRef[] };

export type { EquipmentCategory };
