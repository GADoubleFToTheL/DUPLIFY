const COLORS = ['#ff5b4f', '#ffcb3d', '#3f8cff', '#46c46c', '#ff9b3d', '#9a6bff', '#ff7eb6'];

/** Schriftzug „Duplify“ aus bunten Bausteinen. */
export function Logo({ text = 'Duplify' }: { text?: string }) {
  return (
    <div className="logo" aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} className="logo-letter" style={{ background: COLORS[i % COLORS.length], animationDelay: `${i * 0.12}s` }}>
          <span className="logo-stud" />
          <span className="logo-stud" />
          {ch}
        </span>
      ))}
    </div>
  );
}
