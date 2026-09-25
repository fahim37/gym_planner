import type { SVGProps } from "react";

/** Small stroke icon set (24×24, currentColor) used by the app chrome and controls. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Svg>
);

export const DumbbellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Svg>
);

export const BodyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M5 8.5c2.5.8 4.5 1 7 1s4.5-.2 7-1" />
    <path d="M12 9.5V14M9.5 21l1-7h3l1 7" />
  </Svg>
);

export const RackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V3M19 21V3M5 7h14M3 21h4M17 21h4" />
    <path d="M2.5 12h19M8 10v4M16 10v4" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17M8 14.5l2.5 2.5L16 13" />
  </Svg>
);

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const PlayIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 7 4.8Z" />
  </Svg>
);

export const PauseIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="5.5" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="14" y="4" width="4.5" height="16" rx="1.2" />
  </Svg>
);

export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Svg>
);

export const CollapseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);

export const FilterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);

export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Svg>
);

export const SoundOnIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
);

export const SoundOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const SwipeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.6a3 3 0 0 1-3 2.6H11a3 3 0 0 1-2.4-1.2L5.6 15a1.5 1.5 0 0 1 2.2-2L9 14" />
    <path d="M3 5h3M3 5l1.5-1.5M3 5l1.5 1.5M21 5h-3M21 5l-1.5-1.5M21 5l-1.5 1.5" />
  </Svg>
);

export const MachineIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="7" height="18" rx="1.5" />
    <path d="M4 8h7M4 12h7M4 16h7M11 5h6.5a2 2 0 0 1 2 2v14M15 12h4.5" />
  </Svg>
);

export const MatIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="15" height="8" rx="1.5" />
    <path d="M18 9.5a3 3 0 0 1 0 5" />
    <circle cx="19.5" cy="12" r="1.5" />
  </Svg>
);
