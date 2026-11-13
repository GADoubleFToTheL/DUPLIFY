export type NoppiMood = 'idle' | 'wave' | 'cheer' | 'sleep' | 'think';

interface Props {
  mood?: NoppiMood;
  size?: number;
  color?: string;
  dark?: string;
  onClick?: () => void;
}

/**
 * Noppi – das Maskottchen: ein kleiner roter Baustein mit Kulleraugen.
 * Animationen kommen aus CSS (siehe ui.css, Klassen `noppi--<mood>`).
 */
export function Noppi({ mood = 'idle', size = 220, color = '#ff5b4f', dark = '#cf3a30', onClick }: Props) {
  const sleeping = mood === 'sleep';
  const cheering = mood === 'cheer';
  return (
    <svg
      className={`noppi noppi--${mood}`}
      width={size}
      height={size * 1.1}
      viewBox="0 0 200 220"
      onClick={onClick}
      role="img"
      aria-label="Noppi"
    >
      <defs>
        <linearGradient id="noppi-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="0.25" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <ellipse className="noppi-shadow" cx="100" cy="208" rx="62" ry="9" fill="rgba(30,60,100,0.18)" />
      <g className="noppi-jump">
        <g className="noppi-feet">
          <rect x="52" y="180" width="34" height="22" rx="10" fill={dark} />
          <rect x="114" y="180" width="34" height="22" rx="10" fill={dark} />
        </g>
        <g className="noppi-arm noppi-arm--left">
          <rect x="14" y="108" width="26" height="54" rx="13" fill={color} stroke={dark} strokeWidth="3" />
        </g>
        <g className="noppi-arm noppi-arm--right">
          <rect x="160" y="108" width="26" height="54" rx="13" fill={color} stroke={dark} strokeWidth="3" />
        </g>
        <g className="noppi-studs">
          {[52, 116].map((x) => (
            <g key={x}>
              <rect x={x} y="30" width="32" height="26" rx="6" fill={dark} />
              <ellipse cx={x + 16} cy="31" rx="16" ry="6.5" fill={color} />
              <ellipse cx={x + 12} cy="29.5" rx="7" ry="2.4" fill="#fff" opacity="0.45" />
            </g>
          ))}
        </g>
        <rect x="30" y="50" width="140" height="136" rx="28" fill="url(#noppi-body)" stroke={dark} strokeWidth="3" />
        <rect x="42" y="58" width="60" height="10" rx="5" fill="#fff" opacity="0.25" />
        <g className="noppi-eyes">
          {[74, 126].map((x) => (
            <g key={x} className="noppi-eye" style={{ transformOrigin: `${x}px 108px` }}>
              {sleeping ? (
                <path d={`M${x - 16} 110 q16 12 32 0`} stroke="#22324d" strokeWidth="5" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse cx={x} cy="106" rx="21" ry="24" fill="#fff" />
                  <circle className="noppi-pupil" cx={x + 3} cy="110" r="11" fill="#22324d" />
                  <circle cx={x + 7} cy="104" r="4" fill="#fff" />
                </>
              )}
            </g>
          ))}
        </g>
        <ellipse cx="54" cy="140" rx="11" ry="7" fill="#ff9db0" opacity="0.75" />
        <ellipse cx="146" cy="140" rx="11" ry="7" fill="#ff9db0" opacity="0.75" />
        {cheering ? (
          <g>
            <path d="M78 140 q22 34 44 0 z" fill="#8a1f1a" stroke="#22324d" strokeWidth="4" strokeLinejoin="round" />
            <ellipse cx="100" cy="152" rx="10" ry="5" fill="#ff8fa3" />
          </g>
        ) : mood === 'think' ? (
          <path d="M88 146 q12 -6 24 0" stroke="#22324d" strokeWidth="5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M82 140 q18 18 36 0" stroke="#22324d" strokeWidth="5" fill="none" strokeLinecap="round" />
        )}
      </g>
      {sleeping && (
        <g className="noppi-zzz" fill="#4b5d7a" fontFamily="inherit" fontWeight="700">
          <text x="160" y="40" fontSize="22">
            z
          </text>
          <text x="174" y="22" fontSize="16">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
