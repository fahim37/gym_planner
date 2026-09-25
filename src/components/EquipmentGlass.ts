/**
 * Glass styles for the equipment UI, built on the shared liquid-glass classes
 * in globals.css (.glass-strong, .glass-hud, .glass-chip, .glass-border,
 * .surface, .glass-reactive). Only the part sheet blurs its backdrop; overlays
 * on the live 3D canvas use the no-blur HUD glass. Per the shared rules, no
 * ring-/shadow- utilities are combined with these classes.
 */

/** Controls, pills and markers over the live 3D stage (no blur). */
export const GLASS_HUD = "glass-hud";

/** The part sheet: dense blurred glass for text. */
export const GLASS_STRONG = "glass-strong text-white";

/** Chip on the page (no blur). */
export const GLASS_CHIP = "glass-chip text-zinc-200 hover:bg-white/10";

/** Selected chip or marker: liquid amber — solid fill plus the shared glass edge and sheen. */
export const GLASS_ACTIVE = "glass-border bg-amber-300 text-zinc-900";

/** Content card in a list or grid (no blur). */
export const SURFACE = "surface";

/** Hotspot marker bead over the canvas. */
export const BEAD = "glass-hud text-amber-300";

/** Spring motion for transform/opacity (Tailwind 4 scale/translate are separate properties). */
export const SPRING = "transition-[transform,translate,scale,opacity,background-color] duration-500 ease-spring";
