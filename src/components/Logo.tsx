import { useId } from "react";

/**
 * Brand mark: a glossy amber squircle with an angled dumbbell (red grip, like the
 * muscle highlights). The same design as the generated app icons (src/lib/app-icon.tsx).
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`${id}shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}plate`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#27272a" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="17" fill={`url(#${id}bg)`} />
      <path d="M18 1.5h28a16.5 16.5 0 0 1 16.5 16.5v4C44 28 20 28 1.5 22v-4A16.5 16.5 0 0 1 18 1.5Z" fill={`url(#${id}shine)`} />
      <g transform="rotate(-32 32 32)">
        <rect x="9" y="22.5" width="6" height="19" rx="2.2" fill={`url(#${id}plate)`} />
        <rect x="15.8" y="17.5" width="7.4" height="29" rx="2.6" fill={`url(#${id}plate)`} />
        <rect x="23" y="28.6" width="18" height="6.8" rx="2.2" fill="#dc2626" />
        <rect x="23" y="28.6" width="18" height="2.4" rx="1.2" fill="#fff" fillOpacity="0.28" />
        <rect x="40.8" y="17.5" width="7.4" height="29" rx="2.6" fill={`url(#${id}plate)`} />
        <rect x="49" y="22.5" width="6" height="19" rx="2.2" fill={`url(#${id}plate)`} />
        <rect x="17.2" y="19.5" width="1.6" height="25" rx="0.8" fill="#fff" fillOpacity="0.18" />
        <rect x="42.2" y="19.5" width="1.6" height="25" rx="0.8" fill="#fff" fillOpacity="0.18" />
      </g>
      <rect x="1.5" y="1.5" width="61" height="61" rx="16.5" fill="none" stroke="#fff" strokeOpacity="0.35" />
    </svg>
  );
}

/** Mark + two-tone wordmark ("IRON" white, "FORM" amber). */
export function Logo({ name }: { name: string }) {
  const split = name.toUpperCase().indexOf("FORM");
  const head = split > 0 ? name.slice(0, split) : name;
  const tail = split > 0 ? name.slice(split) : "";
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={34} className="shrink-0 drop-shadow-[0_4px_12px_rgba(251,191,36,0.45)]" />
      <span className="display text-[1.15rem] leading-none tracking-tight">
        <span className="text-white">{head}</span>
        <span className="bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-transparent">{tail}</span>
      </span>
    </span>
  );
}
