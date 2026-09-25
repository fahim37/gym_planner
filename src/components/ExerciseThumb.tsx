"use client";

import { useEffect, useRef, useState } from "react";
import { getExercise } from "@/data/exercises";

/** Lazily rendered 3D still of an exercise, generated in the browser. */
export default function ExerciseThumb({ slug, className }: { slug: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const exercise = getExercise(slug);
    const el = ref.current;
    if (!exercise || !el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import("@/lib/three/thumbnails")
          .then(({ thumbnail }) => thumbnail(exercise))
          .then((url) => !cancelled && setSrc(url))
          .catch(() => undefined);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [slug]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-gradient-to-b from-white to-zinc-200 ${className ?? ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={src} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-zinc-200" />
      )}
    </div>
  );
}
