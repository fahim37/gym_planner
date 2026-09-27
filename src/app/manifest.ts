import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** Makes the guide installable ("Add to Home Screen") and open like a native app. */
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${BASE}/`,
    name: `${SITE.name} — Workout Guide`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: `${BASE}/icon/small`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icon/large`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icon/maskable`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${BASE}/apple-icon`, sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Exercises", short_name: "Exercises", url: `${BASE}/exercises`, description: "Browse every animated exercise" },
      { name: "Muscle map", short_name: "Muscles", url: `${BASE}/muscles`, description: "Tap a muscle to see what trains it" },
      { name: "Programs", short_name: "Programs", url: `${BASE}/programs`, description: "Pick up your workout plan" },
      { name: "Equipment", short_name: "Equipment", url: `${BASE}/equipment`, description: "How to use the gym's machines" },
    ],
  };
}
