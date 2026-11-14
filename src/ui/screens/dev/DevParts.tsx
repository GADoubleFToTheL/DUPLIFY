import { OrbitControls } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { COLORS } from '../../../core/colors';
import { PARTS, allParts, getPart } from '../../../core/parts/catalog';
import type { ColorId, Placement, Print } from '../../../core/types';
import { CreationModel } from '../../../three/CreationModel';
import { Ground } from '../../../three/Ground';
import { Scene3D } from '../../../three/Scene3D';
import { ModelsGate } from '../../components/ModelsGate';
import { PartThumbnail } from '../../components/PartThumbnail';

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
  return out;
}

/** Entwickler-Seite: die Standardteile in 3D, darunter alle Teile des Katalogs als Vorschaubild. */
export function DevParts() {
  const placements = useMemo(() => layout(ITEMS), []);
  const [party, setParty] = useState(false);
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allParts().filter((p) => !q || `${p.id} ${p.name} ${p.en ?? ''}`.toLowerCase().includes(q));
  }, [query]);
  return (
    <div className="screen" style={{ padding: 0 }}>
      <div style={{ flex: 3, position: 'relative' }} data-testid="dev-canvas">
        <ModelsGate placements={placements}>
          <Scene3D camera={{ position: [17, 22, 46], fov: 35 }}>
            <group position={[-17, 0, -10]}>
              <CreationModel placements={placements} party={party} />
            </group>
            <Ground radius={60} />
            <OrbitControls target={[0, 0, 0]} makeDefault />
          </Scene3D>
        </ModelsGate>
        <button
          className={`brick-btn ${party ? 'c-green' : 'c-purple'}`}
          style={{ position: 'absolute', right: 16, top: 8 }}
          onClick={() => setParty((p) => !p)}
        >
          {party ? 'Party an' : 'Party aus'}
        </button>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <input className="text-input" placeholder={`${list.length} Teile – suchen …`} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div
        className="scroll"
        style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, padding: 12 }}
      >
        {list.map((p) => (
          <div key={p.id} className="card" style={{ padding: 6, textAlign: 'center' }} data-testid={`dev-part-${p.id}`}>
            <PartThumbnail part={p.id} color={p.colorable ? 'rot' : null} size={160} />
            <div style={{ fontSize: 11, lineHeight: 1.2 }}>
              <b>{p.id}</b> · {p.w}×{p.l}×{p.h / 2}
              <br />
              {p.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
