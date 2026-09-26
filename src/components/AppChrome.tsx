"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { SITE } from "@/config/site";
import { Logo } from "./Logo";
import {
  currentKey,
  isReturnVisit,
  markReturnVisit,
  readStack,
  recordVisit,
  rememberLink,
  restoreScroll,
  saveScroll,
  saveTabUrl,
  tabUrl,
} from "@/lib/nav-memory";
import {
  BodyIcon,
  CalendarIcon,
  ChevronLeft,
  DumbbellIcon,
  HomeIcon,
  RackIcon,
  SearchIcon,
} from "./icons";

type Tab = { href: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/exercises", label: "Exercises", icon: DumbbellIcon },
  { href: "/muscles", label: "Muscles", icon: BodyIcon },
  { href: "/equipment", label: "Equipment", icon: RackIcon },
  { href: "/programs", label: "Programs", icon: CalendarIcon },
];

/** Full-screen flows (the workout player) hide the app chrome on phones. */
export function isFocusRoute(pathname: string) {
  return /^\/programs\/[^/]+\/day\/[^/]+/.test(pathname);
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The section a detail page belongs to, for the mobile back button. */
function parentOf(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const tab = TABS.find((t) => t.href === `/${parts[0]}`);
  if (!tab) return null;
  // /programs/x/day/1 goes back to the program, everything else to its section.
  if (parts[0] === "programs" && parts.length > 2) return { href: `/programs/${parts[1]}`, label: "Program" };
  return { href: tab.href, label: tab.label };
}

/** Tapping the tab you're already on scrolls back to the top, like a native app. */
function scrollTopIfCurrent(e: MouseEvent, pathname: string, href: string) {
  if (pathname !== href) return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const parent = parentOf(pathname);
  // "Back" returns to wherever you came from (list, muscle, program…) with its scroll and filters.
  const [backLabel, setBackLabel] = useState<string | null>(null);
  const parentHref = parent?.href;
  useEffect(() => {
    // Next frame: the page's own effect records this visit in the stack first.
    const raf = requestAnimationFrame(() => {
      const prev = readStack().at(-2);
      setBackLabel(prev && parentHref && prev.split("?")[0] !== parentHref ? "Back" : null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, parentHref]);
  const goBack = (e: MouseEvent) => {
    if (readStack().length < 2) return;
    e.preventDefault();
    router.back();
  };
  return (
    <header data-app-chrome className={`glass sticky top-0 z-30 pt-safe ${isFocusRoute(pathname) ? "hidden md:block" : ""}`}>
      <div className="mx-auto flex h-[var(--topbar-h)] max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center">
          {parent && (
            <Link
              href={parent.href}
              onClick={goBack}
              className="glass-chip -ml-1.5 flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3.5 text-sm font-semibold text-amber-300 transition-transform duration-300 ease-spring active:scale-90 md:hidden"
            >
              <ChevronLeft size={22} />
              <span className="max-w-[9rem] truncate">{backLabel ?? parent.label}</span>
            </Link>
          )}
          <Link
            href="/"
            aria-label={`${SITE.name} home`}
            className={`min-h-11 shrink-0 items-center transition-transform duration-300 ease-spring active:scale-95 ${parent ? "hidden md:flex" : "flex"}`}
          >
            <Logo name={SITE.name} />
          </Link>
        </div>
        <nav className="hidden gap-1 text-sm font-semibold md:flex" aria-label="Main">
          {TABS.slice(1).map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 transition-transform duration-300 ease-spring active:scale-95 ${
                  active ? "glass-chip text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/exercises#search"
          aria-label="Search exercises"
          className="glass-chip -mr-1 grid h-10 w-10 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90 md:hidden"
        >
          <SearchIcon size={20} />
        </Link>
      </div>
    </header>
  );
}

/**
 * Floating glass capsule tab bar (phones). A glass "lens" slides behind the
 * active tab; the bar condenses while scrolling down and expands on scroll up.
 */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  /** Tabs keep their place: a tab you left comes back with its filters and scroll position. */
  const openTab = (e: MouseEvent, href: string) => {
    if (pathname === href) return scrollTopIfCurrent(e, pathname, href);
    if (href === "/" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    markReturnVisit(true);
    router.push(tabUrl(href));
  };
  const navRef = useRef<HTMLElement>(null);
  const hidden = isFocusRoute(pathname);

  // Condense on scroll-down / expand on scroll-up by toggling a data attribute (no React re-render).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.removeAttribute("data-compact");
    let anchor = window.scrollY;
    let compact = false;
    let queued = false;
    const update = () => {
      queued = false;
      const y = window.scrollY;
      const dy = y - anchor;
      if (Math.abs(dy) < 12 && y > 0) return;
      anchor = y;
      const next = dy > 0 && y > 64;
      if (next !== compact) {
        compact = next;
        nav.toggleAttribute("data-compact", next);
      }
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, hidden]);

  if (hidden) return null;
  const activeIndex = TABS.findIndex((t) => isActive(pathname, t.href));

  return (
    <nav
      ref={navRef}
      data-app-chrome
      aria-label="Tabs"
      className="group/bar pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(var(--safe-bottom)+var(--tabbar-gap))] md:hidden"
    >
      <div className="glass pointer-events-auto relative mx-auto h-[var(--tabbar-h)] max-w-md origin-bottom rounded-full p-1.5 transition-transform duration-500 ease-spring group-data-[compact]/bar:translate-y-1.5 group-data-[compact]/bar:scale-[0.84]">
        <ul className="relative grid h-full grid-cols-5">
          <li
            aria-hidden
            className={`absolute inset-y-0 left-0 w-1/5 transition-[transform,opacity] duration-500 ease-spring ${activeIndex < 0 ? "opacity-0" : ""}`}
            style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
          >
            <span className="block h-full w-full rounded-full bg-white/[0.13] shadow-[inset_1px_1px_0_rgba(255,255,255,0.28),inset_0_0_0_1px_rgba(255,255,255,0.08),0_6px_16px_-6px_rgba(0,0,0,0.6)]" />
          </li>
          {TABS.map(({ href, label, icon: Icon }, i) => {
            const active = i === activeIndex;
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  onClick={(e) => openTab(e, href)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    active ? "text-amber-300" : "text-zinc-300"
                  }`}
                >
                  <span className="transition-transform duration-500 ease-spring group-active:scale-[0.8] group-data-[compact]/bar:translate-y-[7px] group-data-[compact]/bar:scale-110">
                    <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                  </span>
                  <span className="transition-opacity duration-200 group-data-[compact]/bar:opacity-0">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Hides its children on phones during full-screen flows (e.g. the footer in the workout player). */
export function ChromeOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={isFocusRoute(pathname) ? "hidden md:block" : undefined}>{children}</div>;
}

/** Re-mounts on navigation so each page fades in. Opacity only: transforms would break fixed children. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Navigation memory: scroll positions, tapped links, the in-app back stack.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const onPop = () => markReturnVisit(true);
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (!isReturnVisit()) saveScroll();
      });
    };
    const onClick = (e: globalThis.MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href");
      if (!href?.startsWith("/")) return;
      saveScroll();
      rememberLink(href);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    recordVisit(currentKey());
    const tab = `/${pathname.split("/")[1] ?? ""}`;
    if (tab !== "/" && pathname === tab) saveTabUrl(tab, currentKey());
    if (isReturnVisit()) restoreScroll();
  }, [pathname]);

  return (
    <div key={pathname} className="animate-page flex-1">
      {children}
    </div>
  );
}

/** Slow ambient colour behind the glass (see `.ambient` in globals.css). */
export function Ambient() {
  return (
    <div aria-hidden className="ambient">
      <span />
      <span />
      <span />
    </div>
  );
}

/**
 * App-wide glass helpers:
 * - marks <html class="low-power"> on weak devices / reduced transparency, which turns blur off;
 * - feeds the pointer position to `.glass-reactive` surfaces (--mx/--my) for the moving highlight.
 */
export function GlassEffects() {
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak =
      (nav.hardwareConcurrency ?? 8) <= 2 ||
      (nav.deviceMemory ?? 8) <= 2 ||
      window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    document.documentElement.classList.toggle("low-power", weak);

    let queued = false;
    let last: PointerEvent | null = null;
    const apply = () => {
      queued = false;
      const e = last;
      const el = e && (e.target as Element | null)?.closest?.<HTMLElement>(".glass-reactive");
      if (!e || !el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onMove);
    };
  }, []);
  return null;
}
