import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Ambient, ChromeOnly, GlassEffects, PageTransition, SiteHeader, TabBar } from "@/components/AppChrome";
import Pwa from "@/components/Pwa";
import { SITE } from "@/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} — Workout Guide`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: SITE.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Ambient />
        <GlassEffects />
        <SiteHeader />
        {/* Bottom padding keeps every route's last content clear of the floating tab bar (phones). */}
        <main className="flex flex-1 flex-col pb-[var(--tabbar-offset)]">
          <PageTransition>{children}</PageTransition>
          <ChromeOnly>
            <footer className="px-4 py-8 text-center text-xs text-zinc-500">
              <p>
                {SITE.gym} · Workout guide. Check with a trainer or doctor before starting a new program, and stop if anything
                hurts.
              </p>
            </footer>
          </ChromeOnly>
        </main>
        <TabBar />
        <Pwa />
      </body>
    </html>
  );
}
