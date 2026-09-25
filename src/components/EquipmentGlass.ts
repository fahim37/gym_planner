/**
 * Liquid-glass styles for the equipment UI, written as Tailwind utilities.
 * They mirror the shared `.glass`, `.glass-strong` and `.glass-chip` classes
 * planned for globals.css — swap the strings for those names once they land.
 *
 * Only GLASS and GLASS_STRONG blur the backdrop: keep them to a few small,
 * non-overlapping layers (no blur on blur) so phones hold 120 fps. Chips,
 * cards and hotspot markers sit on flat or fast-moving backgrounds, so they
 * fake the glass with a tint, a specular top edge and a hairline ring.
 */

/** Floating controls over the 3D view: smoky tint, blur + saturate, top sheen. */
export const GLASS =
  "text-white backdrop-blur-xl backdrop-saturate-[1.8] bg-[linear-gradient(180deg,rgb(255_255_255/0.2),rgb(255_255_255/0.04)_55%),linear-gradient(rgb(24_24_27/0.5),rgb(24_24_27/0.5))] ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.45),inset_0_-1px_1px_rgb(0_0_0/0.18),0_8px_24px_-8px_rgb(0_0_0/0.5),0_2px_6px_rgb(0_0_0/0.15)]";

/** Denser glass for panels with text (the part sheet). */
export const GLASS_STRONG =
  "text-white backdrop-blur-2xl backdrop-saturate-[1.8] bg-[linear-gradient(180deg,rgb(255_255_255/0.14),rgb(255_255_255/0.02)_40%),linear-gradient(rgb(24_24_27/0.74),rgb(24_24_27/0.74))] ring-1 ring-inset ring-white/15 shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.35),0_24px_48px_-16px_rgb(0_0_0/0.65),0_4px_12px_rgb(0_0_0/0.2)]";

/** Light glass pill over the light 3D background (hints). */
export const GLASS_LIGHT =
  "text-zinc-700 backdrop-blur-md bg-white/55 ring-1 ring-inset ring-white/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_14px_-6px_rgb(0_0_0/0.25)]";

/** Chip on the dark page (no blur needed over a flat background). */
export const GLASS_CHIP =
  "text-zinc-200 bg-[linear-gradient(180deg,rgb(255_255_255/0.11),rgb(255_255_255/0.04))] ring-1 ring-inset ring-white/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_6px_16px_-8px_rgb(0_0_0/0.7)] hover:bg-[linear-gradient(180deg,rgb(255_255_255/0.16),rgb(255_255_255/0.07))]";

/** Selected chip: liquid amber with a bright rim and a warm glow. */
export const GLASS_CHIP_ACTIVE =
  "text-zinc-900 bg-[linear-gradient(180deg,#fde68a,#fcd34d_60%,#fbbf24)] ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.8),0_8px_20px_-8px_rgb(251_191_36/0.7)]";

/** Card / panel on the dark page. */
export const GLASS_CARD =
  "bg-[linear-gradient(180deg,rgb(255_255_255/0.08),rgb(255_255_255/0.025))] ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_20px_40px_-20px_rgb(0_0_0/0.9)]";

/** Hotspot marker: glassy bead (no backdrop blur — markers move every frame). */
export const GLASS_BEAD =
  "text-amber-300 bg-[radial-gradient(circle_at_50%_22%,rgb(255_255_255/0.42),rgb(39_39_42/0.82)_58%,rgb(9_9_11/0.9))] ring-[1.5px] ring-white/80 shadow-[inset_0_-2px_3px_rgb(0_0_0/0.35),0_4px_12px_rgb(0_0_0/0.35)]";

export const GLASS_BEAD_ACTIVE =
  "text-zinc-900 bg-[radial-gradient(circle_at_50%_22%,#fffbeb,#fcd34d_55%,#f59e0b)] ring-[1.5px] ring-white shadow-[inset_0_-2px_3px_rgb(180_83_9/0.35),0_6px_18px_rgb(245_158_11/0.55)]";

/** Spring-like motion for transform/opacity (Tailwind 4 scale/translate are separate properties). */
export const SPRING =
  "transition-[transform,translate,scale,opacity,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
