import { useEffect, useMemo, useState } from 'react';

interface Props {
  value: number;
  max: number;
  onChange: (v: number) => void;
}

const MIN = 3;

function toSlider(v: number, max: number): number {
  if (max <= MIN) return 0;
  return Math.round((Math.log(v / MIN) / Math.log(max / MIN)) * 1000);
}
function fromSlider(s: number, max: number): number {
  return Math.round(MIN * Math.pow(max / MIN, s / 1000));
}

/** Türme in fünf Größen – zum Antippen für das Kind. */
function Tower({ h, active }: { h: number; active: boolean }) {
  const colors = ['#ff5b4f', '#ff9b3d', '#ffcb3d', '#46c46c', '#3f8cff', '#9a6bff'];
  return (
    <svg width="34" height={14 + h * 9} viewBox={`0 0 34 ${14 + h * 9}`} aria-hidden="true" className={active ? 'tower active' : 'tower'}>
      {Array.from({ length: h }, (_, i) => (
        <g key={i}>
          <rect x="3" y={14 + (h - 1 - i) * 9} width="28" height="9" rx="2.5" fill={colors[i % colors.length]} />
        </g>
      ))}
      <rect x="7" y="9" width="7" height="6" rx="2" fill={colors[(h - 1) % colors.length]} />
      <rect x="20" y="9" width="7" height="6" rx="2" fill={colors[(h - 1) % colors.length]} />
    </svg>
  );
}

/** Größen-Regler: Wie viele Steine wollen wir ungefähr verbauen? */
export function SizeSlider({ value, max, onChange }: Props) {
  const safeMax = Math.max(MIN + 1, max);
  const [local, setLocal] = useState(() => toSlider(Math.min(value, safeMax), safeMax));
  useEffect(() => setLocal(toSlider(Math.min(value, safeMax), safeMax)), [value, safeMax]);
  const shown = fromSlider(local, safeMax);
  const presets = useMemo(() => {
    const raw = [5, 10, 20, 40, safeMax];
    return raw.map((v) => Math.min(v, safeMax)).filter((v, i, a) => a.indexOf(v) === i);
  }, [safeMax]);
  const commit = (v: number) => onChange(Math.max(MIN, Math.min(safeMax, v)));
  return (
    <div className="size-slider card" data-testid="size-slider">
      <div className="size-towers">
        {presets.map((p, i) => (
          <button
            key={p}
            className="size-preset"
            onClick={() => {
              setLocal(toSlider(p, safeMax));
              commit(p);
            }}
            aria-label={`${p} Steine`}
          >
            <Tower h={i + 1} active={Math.abs(shown - p) <= Math.max(1, p * 0.15)} />
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={() => commit(fromSlider(local, safeMax))}
        onKeyUp={() => commit(fromSlider(local, safeMax))}
        onTouchEnd={() => commit(fromSlider(local, safeMax))}
        aria-label="Wie viele Steine?"
        data-testid="size-range"
      />
      <div className="size-label">
        {shown >= safeMax ? 'Alle Steine!' : `≈ ${shown} Steine`}
      </div>
    </div>
  );
}
