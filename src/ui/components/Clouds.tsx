const CLOUDS = [
  { top: '8%', w: 160, dur: 70, delay: -10 },
  { top: '18%', w: 110, dur: 55, delay: -40 },
  { top: '5%', w: 90, dur: 80, delay: -60 },
  { top: '28%', w: 140, dur: 95, delay: -25 },
];

/** Langsam ziehende Wolken im Hintergrund. */
export function Clouds() {
  return (
    <div className="clouds" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{ top: c.top, width: c.w, height: c.w * 0.34, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  );
}

/** Grüner Hügel unten (für Start- und Ideen-Seite). */
export function Hill() {
  return <div className="hill" aria-hidden="true" />;
}
