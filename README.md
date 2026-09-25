# IronForm — Animated Workout Guide

A gym workout guide where every exercise is animated in 3D. Members can watch the
movement from any angle, see the target muscles light up in red (secondary
muscles in orange), read step-by-step form cues, and follow programs with
sets, reps and rest timers.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Three.js**.

## Features

- **27 animated exercises** across chest, back, shoulders, arms, core and legs,
  with steps, pro tips, common mistakes, breathing cues and sets/reps/rest.
- **Interactive 3D figure**: drag to rotate, switch between front/side/back,
  play/pause and slow motion, live rep counter.
- **Muscle map**: hover any muscle on the 3D body to name it, click it to see
  the exercises that train it.
- **Programs**: Beginner Full Body, Push/Pull/Legs, Back Builder and a 7-Day
  Core Challenge.
- **Workout player**: guided sessions with set tracking, rest countdown and
  progress saved in the browser.
- **JSON API** for other clients (kiosk screens, a mobile app):
  - `GET /api/exercises?q=&region=&muscle=&equipment=&level=`
  - `GET /api/exercises/:slug`
  - `GET /api/muscles`
  - `GET /api/programs`, `GET /api/programs/:slug`

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm run build`.

## Customising for your gym

- **Name and tagline**: `src/config/site.ts`
- **Exercises**: `src/data/exercises.ts`
- **Programs**: `src/data/programs.ts`
- **Muscles**: `src/lib/muscles.ts`

## How the animation works

There are no video files. Each exercise is a short list of keyframe **poses**
written in centimetres from a side view (see `src/lib/anatomy/types.ts`):

- `hip` / `torso` place the pelvis and the lean of the spine.
- Each arm or leg is either **IK**, where you give the hand or foot position and
  the elbow/knee is solved (`ik` + `pole`), or **angles**, where you give the
  segment angles directly.
- `src/lib/anatomy/solver.ts` turns a pose into joint positions.
- `src/lib/anatomy/timeline.ts` eases between keyframes and counts reps.
- `src/lib/three/rig.ts` builds the body from ~60 muscle meshes that follow the
  skeleton. Each muscle is tagged with its id so it can be highlighted or clicked.
- `src/lib/three/props.ts` draws the equipment (barbell, dumbbells, benches,
  pull-up bar, cable machine).

To author or tweak an exercise, run `npm run dev` and open `/dev/<slug>` (for
example `/dev/barbell-back-squat`). It shows every keyframe frozen, from the
exercise's camera angle and from the side. This page is disabled in production.
