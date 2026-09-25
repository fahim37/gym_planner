declare module "artifact-routes" {
  import type { ComponentType } from "react";
  export const ROUTES: { pattern: string; mod: { default: unknown } }[];
  export const NotFoundPage: ComponentType | null;
}
