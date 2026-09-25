import type { NextRequest } from "next/server";
import { getEquipment } from "@/data/equipment";

/** GET /api/equipment/:slug — full equipment guide: parts, how to use, safety, specs. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/equipment/[slug]">) {
  const { slug } = await ctx.params;
  const equipment = getEquipment(slug);
  if (!equipment) return Response.json({ error: "Equipment not found" }, { status: 404 });
  return Response.json(equipment);
}
