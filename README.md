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

## Testing

```bash
npm test                           # all Vitest suites (tests/), ~2 s, no server needed
npx vitest run tests/pose-sanity   # one suite
npx vitest                         # watch mode while authoring
```

| Suite | What it checks |
| --- | --- |
| `tests/solver.test.ts` | Two-bone IK hits reachable targets exactly and clamps unreachable ones; angle limbs; the mirrored second limb; orthonormal torso/head frames; no NaN for random poses. |
| `tests/timeline.test.ts` | Looping, easing endpoints, holds, durations and rep counting (a rep counts on *arrival* at a `rep: true` frame). |
| `tests/data-integrity.test.ts` | Every exercise: unique URL-safe slug, full written content (≥ 3 steps, tips, mistakes, breathing, prescription), valid muscles/equipment/`gear`, a playable animation. Programs reference real exercises with sets/rest > 0. The equipment catalogue and `src/data/equipment.ts` cover every slug and describe every part. |
| `tests/pose-sanity.test.ts` | Solves every keyframe of every exercise plus ~20 in-between moments and fails on NaN, joints (or the head) below the floor, IK targets out of reach, and poses that snap between keyframes. Warns (without failing) when a planted foot slides. |
| `tests/api.test.ts` | Calls every `src/app/api/**/route.ts` handler directly: status codes, filters, 400s for bad filters, 404s for unknown slugs. |

Failures name the exercise slug, the keyframe (or time between two keyframes)
and the limb, e.g. `frame 1: arms[1] IK target … is 64.3 cm from the shoulder,
but the arm reaches 59.0 cm`. Open `/dev/<slug>` in `npm run dev` to see it.

Pose-authoring gotcha the tests catch: the timeline blends only numbers and
keeps the *first* frame's keys. Give consecutive keyframes the same limb form
(`ik` vs `angles`), the same `rel`/`local`, and the same optional keys (write
`foot: 0` rather than leaving it out if the next frame sets `foot`).

**Mobile page audit** (Playwright, needs a running server):

```bash
npm run dev -- -p 3100 &
node scripts/audit-pages.mjs http://localhost:3100 [--only=/equipment] [--out=DIR]
```

It opens every page (routes come from `src/app` and the data) as a 390×844
touch phone and reports console errors, uncaught exceptions, HTTP errors and
failed requests, broken internal links, horizontal overflow, tap targets under
40×40 px, images without `alt` and unlabeled controls. The report is written to
`audit.txt` / `audit.json` (default `$TMPDIR/gym-workout-audit`); the exit
code is 1 when there are errors.

**CI** (`.github/workflows/ci.yml`) runs on every push and pull request with
Node 22: `npm ci`, lint, `next typegen` + typecheck, `npm test`, `next build`.
