/**
 * Artwork for the generated app icons (src/app/icon.tsx, apple-icon.tsx): a dark,
 * angled dumbbell with a red grip on a glossy amber tile (the header's LogoMark). Plain flexbox so it renders with
 * `ImageResponse` (Satori). `inset` shrinks the art for maskable icons, `radius`
 * rounds the tile for browsers that show the icon as-is.
 */
export function AppIconArt({ size, inset = 0, radius = 0 }: { size: number; inset?: number; radius?: number }) {
  const s = size * (1 - inset * 2);
  const plate = (w: number, h: number) => (
    <div
      style={{
        width: w * s,
        height: h * s,
        background: "linear-gradient(90deg, #27272a, #09090b)",
        borderRadius: 0.04 * s,
        display: "flex",
      }}
    />
  );
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fde68a 0%, #fbbf24 55%, #f59e0b 100%)",
        borderRadius: radius * size,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "38%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0))",
          borderTopLeftRadius: radius * size,
          borderTopRightRadius: radius * size,
          display: "flex",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 0.012 * s, transform: "rotate(-32deg)" }}>
        {plate(0.094, 0.3)}
        {plate(0.116, 0.45)}
        <div style={{ width: 0.28 * s, height: 0.106 * s, background: "#dc2626", borderRadius: 0.035 * s, display: "flex" }} />
        {plate(0.116, 0.45)}
        {plate(0.094, 0.3)}
      </div>
    </div>
  );
}
