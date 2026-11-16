interface Props {
  spinning?: boolean;
  onClick?: () => void;
}

/** Lachende Sonne mit sich drehenden Strahlen – antippen lässt sie wirbeln. */
export function Sun({ spinning, onClick }: Props) {
  return (
    <button className={`sun ${spinning ? 'sun--spin' : ''}`} onClick={onClick} aria-label="Sonne" data-testid="sun">
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <g className="sun-rays">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="55" y="1" width="10" height="22" rx="5" fill="#ffc21f" transform={`rotate(${i * 30} 60 60)`} />
          ))}
        </g>
        <circle cx="60" cy="60" r="35" fill="#ffd84d" stroke="#f5b400" strokeWidth="3" />
        <ellipse cx="49" cy="55" rx="4.5" ry="5.5" fill="#22324d" />
        <ellipse cx="71" cy="55" rx="4.5" ry="5.5" fill="#22324d" />
        <circle cx="50.5" cy="53" r="1.6" fill="#fff" />
        <circle cx="72.5" cy="53" r="1.6" fill="#fff" />
        <circle cx="40" cy="66" r="5.5" fill="#ff9db0" opacity="0.75" />
        <circle cx="80" cy="66" r="5.5" fill="#ff9db0" opacity="0.75" />
        <path d="M47 67 q13 12 26 0" stroke="#22324d" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );
}
