import { buildBodyData, type BodyData } from "./build";

export type { BodyData };

let data: BodyData | null = null;

/** The generated body mesh, built once per page and shared by every stage. */
export function getBodyData(): BodyData {
  if (!data) {
    data = buildBodyData();
    if (process.env.NODE_ENV !== "production") console.info("[body] generated", data.stats);
  }
  return data;
}
