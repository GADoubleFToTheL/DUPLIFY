import type { Placement } from '../../core/types';
import { partLabel } from '../../i18n/speech';
import { useThumbnail } from '../../three/useThumbnail';

function PartThumb({ p, size }: { p: Placement; size: number }) {
  const key = `part:${p.part}:${p.color}:${p.print ?? ''}`;
  const url = useThumbnail(key, () => [{ ...p, x: 0, y: 0, z: 0, rot: 0 }], { size: 192, yaw: -0.5, pitch: 0.5 });
  return url ? <img src={url} width={size} height={size} alt="" draggable={false} /> : <div style={{ width: size, height: size }} />;
}

/** Zeigt das Teil, das jetzt gebraucht wird – groß, zum Suchen in der Kiste. */
export function PartCard({ parts }: { parts: Placement[] }) {
  if (parts.length === 0) return null;
  const groups = new Map<string, { p: Placement; n: number }>();
  for (const p of parts) {
    const k = `${p.part}|${p.color}|${p.print ?? ''}`;
    const g = groups.get(k);
    if (g) g.n++;
    else groups.set(k, { p, n: 1 });
  }
  const list = [...groups.values()].slice(0, 3);
  return (
    <div className="part-card card" data-testid="part-card">
      <div className="part-thumbs">
        {list.map(({ p, n }) => (
          <div key={`${p.part}${p.color}${p.print}`} className="part-thumb">
            <PartThumb p={p} size={list.length > 1 ? 78 : 104} />
            {n > 1 && <span className="part-count">×{n}</span>}
          </div>
        ))}
      </div>
      <div className="part-label">{list.length === 1 ? partLabel(list[0].p.part, list[0].p.color, list[0].p.print) : `${parts.length} Teile`}</div>
    </div>
  );
}
