import { notFound } from "next/navigation";
import EquipmentGrid from "./EquipmentGrid";
import { isView } from "./views";

/**
 * All equipment models as stills (dev server only). Query: ?active=1&t=<s>
 * shows the "in use" pose at time t, &view=…, &only=slug,slug, &size=<px>,
 * &check=1 also verifies that moving parts return to rest after the demo.
 */
export default async function DevEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  const t = typeof q.t === "string" ? Number(q.t) : undefined;
  const size = typeof q.size === "string" ? Number(q.size) : 480;
  return (
    <EquipmentGrid
      check={q.check === "1"}
      active={q.active === "1"}
      time={t !== undefined && Number.isFinite(t) ? t : undefined}
      view={isView(q.view) ? q.view : "3q"}
      only={typeof q.only === "string" ? q.only.split(",") : undefined}
      size={Number.isFinite(size) && size > 100 ? size : 480}
    />
  );
}
