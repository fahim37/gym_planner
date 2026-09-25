"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ShareIcon } from "./icons";

/** Copies text, falling back to a hidden textarea where the async clipboard API is blocked. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Native share sheet on phones; copies the link (with a "Link copied" toast) everywhere else. */
export default function ShareButton({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const share = async () => {
    const url = window.location.href;
    // Inside an iframe (e.g. an embedded preview) the share sheet is usually blocked: copy straight away,
    // while the click still counts as a user gesture.
    const embedded = window.self !== window.top;
    if (typeof navigator.share === "function" && !embedded) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    setToast((await copy(url)) ? "Link copied" : "Couldn't copy the link");
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Share ${title}`}
      className={`glass-chip relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-200 transition-transform duration-300 ease-spring active:scale-90 ${className}`}
    >
      {toast === "Link copied" ? <CheckIcon size={20} className="text-emerald-300" /> : <ShareIcon size={20} />}
      {toast && (
        <span
          role="status"
          className="glass-strong animate-fade pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-white"
        >
          {toast}
        </span>
      )}
    </button>
  );
}
