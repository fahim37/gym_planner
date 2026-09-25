import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
};

const NAV = [
  { href: "/exercises", label: "Exercises" },
  { href: "/muscles", label: "Muscles" },
  { href: "/programs", label: "Programs" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-300 text-lg font-black text-zinc-900">
                {SITE.name[0]}
              </span>
              <span className="display hidden text-lg sm:inline">{SITE.name}</span>
            </Link>
            <nav className="flex gap-0.5 text-sm font-semibold">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-zinc-300 hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-zinc-500">
          <p>
            {SITE.gym} · Workout guide. Check with a trainer or doctor before starting a new program, and stop if anything
            hurts.
          </p>
        </footer>
      </body>
    </html>
  );
}
