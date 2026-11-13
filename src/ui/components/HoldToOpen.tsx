import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  onOpen: () => void;
  ms?: number;
  label: string;
  children: ReactNode;
}

/** Eltern-Sperre: Knopf muss einige Sekunden gedrückt gehalten werden. */
export function HoldToOpen({ onOpen, ms = 3000, label, children }: Props) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const started = useRef(0);
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setProgress(0);
  };
  const tick = () => {
    const p = (performance.now() - started.current) / ms;
    if (p >= 1) {
      setProgress(0);
      onOpen();
      return;
    }
    setProgress(p);
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <button
      className="hold-btn"
      aria-label={label}
      title={label}
      data-testid="parent-lock"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        started.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="hold-ring" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#46c46c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="hold-icon">{children}</span>
    </button>
  );
}
