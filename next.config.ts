import type { NextConfig } from "next";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Serve under a subpath (e.g. NEXT_PUBLIC_BASE_PATH=/ironform on a VPS); empty on Vercel.
  basePath: BASE_PATH || undefined,
  // The service worker must never be served stale from the HTTP cache, or app updates stall.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
