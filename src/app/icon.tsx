import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";

const ICONS = {
  small: { size: 192, inset: 0.04, radius: 0.22 },
  large: { size: 512, inset: 0.04, radius: 0.22 },
  // Android crops maskable icons to a circle/squircle: full bleed, art inside the safe zone.
  maskable: { size: 512, inset: 0.12, radius: 0 },
} as const;

export function generateImageMetadata() {
  return Object.entries(ICONS).map(([id, { size }]) => ({
    id,
    contentType: "image/png",
    size: { width: size, height: size },
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const icon = ICONS[(await id) as keyof typeof ICONS] ?? ICONS.large;
  return new ImageResponse(<AppIconArt size={icon.size} inset={icon.inset} radius={icon.radius} />, {
    width: icon.size,
    height: icon.size,
  });
}
