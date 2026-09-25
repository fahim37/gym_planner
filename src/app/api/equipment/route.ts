import type { NextRequest } from "next/server";
import { EQUIPMENT, parseCategory, summarizeEquipment } from "@/data/equipment";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment-catalog";

/**
 * GET /api/equipment?category=
 * Lists gym equipment (without long-form instructions). `category` takes a
 * name ("Free weights") or slug ("free-weights").
 */
export function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("category");
  const category = parseCategory(raw);
  if (raw && !category) {
    return Response.json({ error: `Unknown category "${raw}"`, categories: EQUIPMENT_CATEGORIES }, { status: 400 });
  }
  const results = category ? EQUIPMENT.filter((e) => e.category === category) : EQUIPMENT;
  return Response.json({ count: results.length, equipment: results.map(summarizeEquipment) });
}
