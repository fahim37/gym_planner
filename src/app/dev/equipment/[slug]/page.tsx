import { notFound } from "next/navigation";
import { isEquipmentSlug } from "@/lib/equipment-catalog";
import { isView } from "../views";
import EquipmentPreview from "./EquipmentPreview";

/**
 * Equipment model preview (dev server only): /dev/equipment/<slug>.
 * Query: ?active=1 starts the "in use" demo, &t=<seconds> freezes it at that
 * time, &view=3q|front|side|left|back|top, &labels=0 hides hotspot labels.
 */
export default async function DevEquipmentModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  if (!isEquipmentSlug(slug)) notFound();
  const q = await searchParams;
  const t = typeof q.t === "string" ? Number(q.t) : undefined;
  return (
    <EquipmentPreview
      key={slug}
      slug={slug}
      active={q.active === "1"}
      time={t !== undefined && Number.isFinite(t) ? t : undefined}
      view={isView(q.view) ? q.view : "3q"}
      labels={q.labels !== "0"}
    />
  );
}
