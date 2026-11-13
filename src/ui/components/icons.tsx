import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 36, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconNext = (p: P) => (
  <Svg {...p}>
    <path d="M17 9 L35 24 L17 39 Z" fill="currentColor" />
  </Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M31 9 L13 24 L31 39 Z" fill="currentColor" />
  </Svg>
);
export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M7 23 L24 8 L41 23" />
    <path d="M12 21 V40 H36 V21" />
    <path d="M21 40 V29 H27 V40" fill="currentColor" />
  </Svg>
);
export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="10" y="21" width="28" height="20" rx="5" fill="currentColor" />
    <path d="M16 21 V15 a8 8 0 0 1 16 0 V21" />
  </Svg>
);
export const IconDice = (p: P) => (
  <Svg {...p} strokeWidth={4}>
    <rect x="7" y="7" width="34" height="34" rx="9" />
    {[
      [16, 16],
      [32, 16],
      [24, 24],
      [16, 32],
      [32, 32],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill="currentColor" stroke="none" />
    ))}
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p} strokeWidth={4}>
    <path d="M6 16 h9 l4 -6 h10 l4 6 h9 v24 h-36 z" />
    <circle cx="24" cy="27" r="7" />
  </Svg>
);
export const IconSound = ({ on = true, ...p }: P & { on?: boolean }) => (
  <Svg {...p} strokeWidth={4}>
    <path d="M7 19 h8 l11 -9 v28 l-11 -9 h-8 z" fill="currentColor" />
    {on ? (
      <>
        <path d="M32 18 a8 8 0 0 1 0 12" />
        <path d="M37 13 a15 15 0 0 1 0 22" />
      </>
    ) : (
      <path d="M33 17 l10 14 M43 17 l-10 14" />
    )}
  </Svg>
);
export const IconReplay = (p: P) => (
  <Svg {...p} strokeWidth={4.5}>
    <path d="M38 24 a14 14 0 1 1 -5 -10.7" />
    <path d="M35 6 v9 h-9" />
  </Svg>
);
export const IconStar = (p: P) => (
  <Svg {...p} strokeWidth={3}>
    <path
      d="M24 5 l5.6 11.6 12.8 1.8 -9.3 9 2.2 12.7 -11.3 -6 -11.3 6 2.2 -12.7 -9.3 -9 12.8 -1.8 z"
      fill="currentColor"
    />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M10 25 L20 35 L39 13" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M24 10 V38 M10 24 H38" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M10 24 H38" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M13 13 L35 35 M35 13 L13 35" />
  </Svg>
);

/** Ein bunter Spielbaustein (statt Ziegel-Emoji). */
export const IconBrick = ({ size = 48, color = '#ffcb3d', dark = '#d9a20c' }: { size?: number; color?: string; dark?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <rect x="9" y="7" width="11" height="9" rx="3" fill={dark} />
    <rect x="28" y="7" width="11" height="9" rx="3" fill={dark} />
    <ellipse cx="14.5" cy="8" rx="5.5" ry="2.4" fill={color} />
    <ellipse cx="33.5" cy="8" rx="5.5" ry="2.4" fill={color} />
    <rect x="4" y="14" width="40" height="28" rx="6" fill={color} stroke={dark} strokeWidth="2.5" />
    <rect x="9" y="18" width="16" height="4" rx="2" fill="#fff" opacity="0.4" />
  </svg>
);
