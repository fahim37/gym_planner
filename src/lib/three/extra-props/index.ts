import { CORE_PROPS } from "./core";
import { LOWER_PROPS } from "./lower";
import { MACHINE_PROPS } from "./machines";
import type { ExtraProp, ExtraPropParams } from "./types";
import { UPPER_PROPS } from "./upper";

const REGISTRY = { ...LOWER_PROPS, ...UPPER_PROPS, ...CORE_PROPS, ...MACHINE_PROPS };

/** Builds a plug-in prop by kind, or null (with a console warning) if none is registered. */
export function buildExtraProp(kind: string, params: ExtraPropParams): ExtraProp | null {
  const builder = REGISTRY[kind];
  if (!builder) {
    console.warn(`Unknown extra prop kind "${kind}"`);
    return null;
  }
  return builder(params);
}

export type { ExtraProp, ExtraPropBuilder, ExtraPropParams } from "./types";
