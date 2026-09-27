import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** Makes the guide installable ("Add to Home Screen") and open like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/ironform/",
    name: `${SITE.name} — Workout Guide`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/ironform/",
    scope: "/ironform/",
    display: "standalone",
    orientation: "portrait",
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/ironform/icon/small", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ironform/icon/large", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ironform/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/ironform/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Exercises", short_name: "Exercises", url: "/ironform/exercises", description: "Browse every animated exercise" },
      { name: "Muscle map", short_name: "Muscles", url: "/ironform/muscles", description: "Tap a muscle to see what trains it" },
      { name: "Programs", short_name: "Programs", url: "/ironform/programs", description: "Pick up your workout plan" },
      { name: "Equipment", short_name: "Equipment", url: "/ironform/equipment", description: "How to use the gym's machines" },
    ],
  };
}
