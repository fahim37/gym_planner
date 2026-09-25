import { useSyncExternalStore } from "react";

/**
 * In-memory router for the single-file Artifact build. The Artifact frame
 * can't serve real routes, so every page lives in one document and
 * navigation just swaps the rendered page. Browser back works via
 * history.pushState state (the URL itself never changes).
 */
export interface Location {
  pathname: string;
  search: string;
}

const listeners = new Set<() => void>();
let depth = 0;

function parse(href: string, base: Location): Location {
  const url = new URL(href, `https://app.local${base.pathname}${base.search}`);
  return { pathname: url.pathname.replace(/\/+$/, "") || "/", search: url.search };
}

/** Plain `#token` deep links (the only kind an Artifact link can carry), e.g. #equipment. */
function initial(): Location {
  const token = window.location.hash.replace(/^#/, "");
  return { pathname: /^[a-z0-9-]+$/.test(token) ? `/${token}` : "/", search: "" };
}

let current: Location = initial();

function emit(next: Location) {
  current = next;
  listeners.forEach((l) => l());
}

export function navigate(href: string, opts: { replace?: boolean } = {}) {
  if (/^[a-z]+:/i.test(href) && !href.startsWith("https://app.local")) {
    window.open(href, "_blank", "noopener");
    return;
  }
  const next = parse(href, current);
  try {
    const state = { href: next.pathname + next.search };
    if (opts.replace) window.history.replaceState(state, "");
    else {
      window.history.pushState(state, "");
      depth++;
    }
  } catch {
    // History API unavailable in this frame; in-app navigation still works.
  }
  emit(next);
  window.scrollTo({ top: 0 });
}

export function back() {
  if (depth > 0) {
    depth--;
    window.history.back();
  } else navigate("/", { replace: true });
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    const href = (e.state as { href?: string } | null)?.href;
    emit(href ? parse(href, current) : initial());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLocation(): Location {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
