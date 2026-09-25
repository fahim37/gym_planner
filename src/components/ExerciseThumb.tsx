"use client";

import { useEffect, useRef, useState } from "react";
import { getExercise } from "@/data/exercises";

/**
 * Lazily rendered 3D still of an exercise, generated in the browser.
 * `eager` renders it right away, e.g. for a slide that's about to be swiped in.
 */
export default function ExerciseThumb({ slug, className, eager }: { slug: string; className?: string; eager?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const exercise = getExercise(slug);
    const el = ref.current;
    if (!exercise || !el) return;
    let cancelled = false;
    const load = () =>
      import("@/lib/three/thumbnails")
        .then(({ thumbnail }) => thumbnail(exercise))
        .then((url) => !cancelled && setSrc(url))
        .catch(() => undefined);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "200px" },
    );
    if (eager) load();
    else observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [slug, eager]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-gradient-to-b from-white to-zinc-200 ${className ?? ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={src} alt="" draggable={false} className="animate-fade h-full w-full select-none object-contain" />
      ) : (
        <div className="skeleton absolute inset-0" />
      )}
    </div>
  );
}
