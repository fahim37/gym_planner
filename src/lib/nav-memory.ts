/**
 * App-like navigation memory (client only):
 * - remembers the scroll position of every page and the link you tapped on it;
 * - on Back (browser, gesture or the header's back button) and on tab taps, the page
 *   comes back where you left it, with the card you opened in view and briefly lit;
 * - keeps an in-app history stack so the header's back button can go *back* instead
 *   of opening a fresh copy of the parent page;
 * - remembers the last list URL (with its filters) of each tab.
 */

const SCROLL = "nav:scroll:";
const LINK = "nav:link:";
const STACK = "nav:stack";
const TAB = "nav:tab:";

let restoring = false;
let started = false;

function get(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): navigation still works, just without memory.
  }
}

export const currentKey = () => window.location.pathname + window.location.search;

/** True while the page being shown is a return visit (Back or a tab tap) rather than a fresh one. */
export function isReturnVisit() {
  return restoring;
}
export function markReturnVisit(v = true) {
  restoring = v;
  started = false;
  // Safety net: a Back that doesn't change the page (same path) still restores and resumes saving.
  if (v) window.setTimeout(() => restoring && !started && restoreScroll(), 500);
}

export function saveScroll() {
  set(SCROLL + currentKey(), String(Math.round(window.scrollY)));
}

export function rememberLink(href: string) {
  set(LINK + currentKey(), href);
}

export function readStack(): string[] {
  try {
    return JSON.parse(get(STACK) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Records a page view in the in-app stack (pops on a return to the previous entry). */
export function recordVisit(path: string) {
  const stack = readStack();
  if (stack[stack.length - 1] === path) return stack;
  if (stack[stack.length - 2] === path) stack.pop();
  else stack.push(path);
  if (stack.length > 50) stack.splice(0, stack.length - 50);
  set(STACK, JSON.stringify(stack));
  return stack;
}

/** Keeps the in-app stack's current entry in step with in-place URL changes (filters). */
export function replaceTop(path: string) {
  const stack = readStack();
  if (!stack.length) return;
  stack[stack.length - 1] = path;
  set(STACK, JSON.stringify(stack));
}

export function saveTabUrl(tab: string, url: string) {
  set(TAB + tab, url);
}
export function tabUrl(tab: string): string {
  return get(TAB + tab) ?? tab;
}

/**
 * Restores the saved scroll position for the current URL once the page is tall enough,
 * then makes sure the last tapped link is on screen and gives it a short glow.
 */
export function restoreScroll() {
  started = true;
  const key = currentKey();
  const saved = Number(get(SCROLL + key) ?? "NaN");
  const link = get(LINK + key);
  let frames = 0;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  window.addEventListener("touchstart", cancel, { once: true, passive: true });
  window.addEventListener("wheel", cancel, { once: true, passive: true });
  const finish = () => {
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("wheel", cancel);
    restoring = false;
    if (cancelled || !link) return;
    const el = document.querySelector<HTMLElement>(`main a[href="${CSS.escape(link)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const bottom = window.innerHeight - 90;
    if (r.top < 70 || r.bottom > bottom) el.scrollIntoView({ block: "center" });
    el.classList.remove("nav-return");
    void el.offsetWidth;
    el.classList.add("nav-return");
    window.setTimeout(() => el.classList.remove("nav-return"), 1400);
  };
  const step = () => {
    if (cancelled || currentKey() !== key) return finish();
    if (Number.isFinite(saved)) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max >= saved - 2 || frames > 40) {
        window.scrollTo({ top: Math.min(saved, max), behavior: "instant" });
        if (Math.abs(window.scrollY - Math.min(saved, max)) < 3 && frames > 2) return finish();
      }
    } else if (frames > 2) return finish();
    if (++frames < 60) requestAnimationFrame(step);
    else finish();
  };
  requestAnimationFrame(step);
}
