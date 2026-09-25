"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Content, or a function that receives `close` to dismiss with the slide-down animation. */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * Native-style bottom sheet: slides up over a dimmed page, drag the handle
 * down (or tap outside / Esc) to dismiss. Rendered into <body> so no parent
 * transform or overflow can clip it.
 */
export default function BottomSheet({ open, onClose, label, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  // The tap that opened the sheet is followed by a synthetic click, which would land on the new backdrop.
  const openedAt = useRef(0);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      onClose();
    }, 200);
  };
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  useEffect(() => {
    if (!open) return;
    openedAt.current = performance.now();
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissRef.current();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (panelRef.current) panelRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t);
    const panel = panelRef.current;
    if (!panel) return;
    const close = d.dy > 90 || velocity > 0.6;
    // Hand the position back to the stylesheet; the class transition takes it from here.
    panel.style.transition = close ? "" : "transform 200ms ease-out";
    panel.style.transform = "";
    if (close) dismiss();
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center" role="presentation">
      <div
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${leaving ? "opacity-0" : "animate-fade"}`}
        onClick={() => performance.now() - openedAt.current > 400 && dismiss()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`glass-strong relative mb-[max(0.5rem,var(--safe-bottom))] max-h-[85dvh] w-[calc(100%-1rem)] max-w-lg origin-bottom overflow-y-auto overscroll-contain rounded-[2rem] pb-4 outline-none ${
          leaving ? "translate-y-[110%] transition-transform duration-200 ease-in" : "animate-sheet"
        }`}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-2 pt-2.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-white/25" />
        </div>
        <div className="px-5">{typeof children === "function" ? children(dismiss) : children}</div>
      </div>
    </div>,
    document.body,
  );
}
