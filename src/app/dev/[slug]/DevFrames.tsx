"use client";

import ExerciseViewer from "@/components/ExerciseViewer";
import { EXERCISES } from "@/data/exercises";

export default function DevFrames({ slug }: { slug: string }) {
  const ex = EXERCISES.find((e) => e.slug === slug)!;
  return (
    <main className="grid grid-cols-2 gap-2 bg-zinc-900 p-2 md:grid-cols-4">
      {ex.animation.frames.flatMap((_, i) =>
        (["preset", "side"] as const).map((view) => (
          <ExerciseViewer
            key={`${i}-${view}`}
            animation={view === "side" ? { ...ex.animation, camera: "side" } : ex.animation}
            primary={ex.primary}
            secondary={ex.secondary}
            frame={i}
            bare
            className="aspect-square"
          />
        )),
      )}
    </main>
  );
}
