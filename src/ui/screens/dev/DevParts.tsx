import { OrbitControls } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { COLORS } from '../../../core/colors';
import { PARTS, getPart } from '../../../core/parts/catalog';
import type { ColorId, Placement, Print } from '../../../core/types';
import { CreationModel } from '../../../three/CreationModel';
import { Ground } from '../../../three/Ground';
import { Scene3D } from '../../../three/Scene3D';
import { useThumbnail } from '../../../three/useThumbnail';

interface Item {
  part: string;
  color: ColorId | null;
  print?: Print;
}

const ITEMS: Item[] = [
  ...PARTS.map((p, i): Item => ({ part: p.id, color: p.colorable ? COLORS[i % 10].id : null })),
  { part: 'brick-2x4', color: 'gelb', print: 'eyes' },
  { part: 'curved-2x3', color: 'gruen', print: 'eyes' },
  { part: 'brick-2x2', color: 'weiss', print: 'picture' },
  { part: 'brick-2x4', color: 'blau', print: 'picture' },
];

function layout(items: Item[]): Placement[] {
  const out: Placement[] = [];
  let x = 0;
  let z = 0;
  let rowDepth = 0;
  for (const it of items) {
    const def = getPart(it.part);
    if (x + def.w > 34) {
      x = 0;
      z += rowDepth + 3;
      rowDepth = 0;
    }
    out.push({ part: it.part, x, y: 0, z, rot: 0, color: it.color, print: it.print });
    x += def.w + 2;
    rowDepth = Math.max(rowDepth, def.l);
  }
  z += rowDepth + 3;
  COLORS.forEach((c, i) => out.push({ part: 'brick-2x4', x: (i % 7) * 5, y: 0, z: z + Math.floor(i / 7) * 3, rot: 0, color: c.id }));
  return out;
}

function Thumb({ item }: { item: Item }) {
  const key = `part:${item.part}:${item.color}:${item.print ?? ''}`;
  const url = useThumbnail(key, () => [{ part: item.part, x: 0, y: 0, z: 0, rot: 0, color: item.color, print: item.print }], {
    size: 160,
  });
  return (
    <div className="card" style={{ width: 120, padding: 8, textAlign: 'center' }}>
      {url ? <img src={url} width={104} height={104} alt="" /> : <div style={{ height: 104 }}>…</div>}
      <div style={{ fontSize: 12 }}>{getPart(item.part).name}</div>
    </div>
  );
}

/** Entwickler-Seite: alle Teile in 3D und als Vorschaubild. */
export function DevParts() {
  const placements = useMemo(() => layout(ITEMS), []);
  const [party, setParty] = useState(false);
  return (
    <div className="screen" style={{ padding: 0 }}>
      <div style={{ flex: 3, position: 'relative' }} data-testid="dev-canvas">
        <Scene3D camera={{ position: [17, 22, 46], fov: 35 }}>
          <group position={[-17, 0, -10]}>
            <CreationModel placements={placements} party={party} />
          </group>
          <Ground radius={60} />
          <OrbitControls target={[0, 0, 0]} makeDefault />
        </Scene3D>
        <button
          className={`brick-btn ${party ? 'c-green' : 'c-purple'}`}
          style={{ position: 'absolute', right: 16, top: 8 }}
          onClick={() => setParty((p) => !p)}
        >
          {party ? 'Party an' : 'Party aus'}
        </button>
      </div>
      <div className="scroll" style={{ flex: 2, display: 'flex', flexWrap: 'wrap', gap: 10, padding: 12 }}>
        {ITEMS.map((it, i) => (
          <Thumb key={i} item={it} />
        ))}
      </div>
    </div>
  );
}
