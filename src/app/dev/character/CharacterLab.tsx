"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EXERCISES } from "@/data/exercises";
import { Timeline } from "@/lib/anatomy/timeline";
import type { CameraPreset, Pose } from "@/lib/anatomy/types";
import type { MuscleId } from "@/lib/muscles";
import { PropSet } from "@/lib/three/props";
import type { Highlights } from "@/lib/three/rig";
import type { Stage } from "@/lib/three/stage";

const A_POSE: Pose = {
  hip: [160, 156],
  torso: 0,
  arms: [{ angles: [4, 10], spread: [20, 16] }],
  legs: [{ ik: { x: 161, y: 245, z: 15 }, pole: [1, 0, 0.1] }],
};

export default function CharacterLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const canvas = canvasRef.current!;
    let raf = 0;
    let stage: Stage | null = null;
    let props: PropSet | null = null;
    let disposed = false;
    import("@/lib/three/stage").then(async ({ Stage }) => {
      if (disposed) return;
      const t0 = performance.now();
      const s = new Stage(canvas, { interactive: true });
      stage = s;
      await s.rig.ready;
      if (disposed) return;
      const built = performance.now() - t0;
      const ex = EXERCISES.find((e) => e.slug === q.get("ex"));
      const h: Highlights = {};
      for (const m of (q.get("sec") ?? "").split(",").filter(Boolean)) h[m as MuscleId] = "secondary";
      for (const m of (q.get("hl") ?? "").split(",").filter(Boolean)) h[m as MuscleId] = "primary";
      if (ex && !q.get("hl")) {
        for (const m of ex.secondary) h[m] = "secondary";
        for (const m of ex.primary) h[m] = "primary";
      }
      s.rig.setHighlights(h);
      const timeline = ex ? new Timeline(ex.animation) : null;
      const frame = Number(q.get("frame") ?? 0);
      const poses = timeline ? Array.from({ length: timeline.length }, (_, i) => timeline.keyframe(i)) : [A_POSE];
      if (ex) {
        props = new PropSet(ex.animation.props ?? []);
        s.scene.add(props.group);
      }
      s.fit(poses, props ?? undefined);
      const pose = timeline ? timeline.keyframe(frame) : A_POSE;
      s.pose(pose);
      props?.update(s.rig);
      s.setPreset((q.get("view") as CameraPreset) ?? ex?.animation.camera ?? "front");
      s.resize(canvas.clientWidth, canvas.clientHeight);
      const focus = q.get("focus");
      if (focus && focus !== "body") {
        const j = s.rig.joints!;
        const side = j.sides[Number(q.get("side") ?? 0)];
        const target =
          focus === "head" ? j.head.clone() :
          focus === "hand" ? side.grip.clone() :
          focus === "foot" ? side.ankle.clone().lerp(side.toe, 0.4) :
          focus === "legs" ? side.knee.clone().lerp(j.pelvis, 0.3) :
          j.chest.clone().lerp(j.pelvis, 0.35);
        const dist = focus === "head" ? 0.75 : focus === "hand" ? 0.45 : focus === "foot" ? 0.6 : 1.5;
        const dir = s.camera.position.clone().sub(s.controls!.target).normalize();
        const az = Number(q.get("az") ?? 0) * (Math.PI / 180);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), az);
        s.controls!.target.copy(target);
        s.camera.position.copy(target).addScaledVector(dir, dist);
        s.camera.lookAt(target);
        s.controls!.update();
      }
      setInfo(`build ${built.toFixed(0)} ms`);
      const play = q.get("play") === "1";
      let frames = 0;
      let last = performance.now();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (play && timeline) {
          s.pose(timeline.sample(now / 1000).pose);
          props?.update(s.rig);
        }
        s.render(now / 1000);
        frames++;
        if (now - last > 1000) {
          const info = s.renderer.info;
          setInfo(`build ${built.toFixed(0)} ms · ${((frames * 1000) / (now - last)).toFixed(0)} fps · ${info.render.calls} calls · ${info.render.triangles} tris · dpr ${s.renderer.getPixelRatio().toFixed(2)}`);
          frames = 0;
          last = now;
        }
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      props?.dispose();
      stage?.dispose();
    };
  }, []);

  return (
    <main className="fixed inset-0 z-[500] bg-gradient-to-b from-white to-zinc-200">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
      <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white" data-testid="info">
        {info}
      </div>
    </main>
  );
}
