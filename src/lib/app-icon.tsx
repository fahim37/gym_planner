import { SITE } from "@/config/site";

/**
 * Artwork for the generated app icons (src/app/icon.tsx, apple-icon.tsx): a dark
 * dumbbell with a red grip on the brand accent. Plain flexbox so it renders with
 * `ImageResponse` (Satori). `inset` shrinks the art for maskable icons, `radius`
 * rounds the tile for browsers that show the icon as-is.
 */
export function AppIconArt({ size, inset = 0, radius = 0 }: { size: number; inset?: number; radius?: number }) {
  const s = size * (1 - inset * 2);
  const ink = SITE.themeColor;
  const plate = (w: number, h: number) => (
    <div style={{ width: w * s, height: h * s, background: ink, borderRadius: 0.025 * s, display: "flex" }} />
  );
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SITE.accentColor,
        borderRadius: radius * size,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 0.018 * s, transform: "rotate(-28deg)" }}>
        {plate(0.075, 0.27)}
        {plate(0.095, 0.42)}
        <div style={{ width: 0.3 * s, height: 0.085 * s, background: "#dc2626", borderRadius: 0.02 * s, display: "flex" }} />
        {plate(0.095, 0.42)}
        {plate(0.075, 0.27)}
      </div>
    </div>
  );
}
