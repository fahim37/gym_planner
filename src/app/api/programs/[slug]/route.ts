import type { NextRequest } from "next/server";
import { getProgram } from "@/data/programs";

/** GET /api/programs/:slug */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/programs/[slug]">) {
  const { slug } = await ctx.params;
  const program = getProgram(slug);
  if (!program) return Response.json({ error: "Program not found" }, { status: 404 });
  return Response.json(program);
}
