import { useMemo, useState } from 'react';
import { createFromRecipe } from '../../../core/engine';
import { sampleCounts } from '../../../core/inventory';
import { RECIPES } from '../../../core/recipes';
import type { Creation } from '../../../core/types';
import { useThumbnail } from '../../../three/useThumbnail';

function Card({ c, id }: { c: Creation | null; id: string }) {
  const url = useThumbnail(c ? `dev-${c.id}` : null, () => c?.placements ?? [], { size: 260 });
  return (
    <div className="card" style={{ padding: 8, textAlign: 'center' }} data-testid={`dev-recipe-${id}`}>
      {c ? (url ? <img src={url} width={220} height={220} alt="" /> : <div style={{ height: 220 }}>…</div>) : <div style={{ height: 220, display: 'grid', placeItems: 'center' }}>—</div>}
      <div style={{ fontWeight: 700 }}>{c ? `${c.emoji} ${c.name}` : id}</div>
      <div className="small">{c ? `${c.partCount} Teile` : 'nicht baubar'}</div>
    </div>
  );
}

/** Entwickler-Seite: alle Baupläne mit der Beispiel-Kiste. */
export function DevRecipes() {
  const [target, setTarget] = useState(16);
  const [seed, setSeed] = useState(1);
  const counts = useMemo(() => sampleCounts(), []);
  const list = useMemo(() => RECIPES.map((r) => ({ id: r.id, c: createFromRecipe(r, { counts, target, seed }, seed * 101) })), [counts, target, seed]);
  return (
    <div className="screen" style={{ padding: 12 }}>
      <div className="row" style={{ gap: 16 }}>
        <b>Ziel: {target}</b>
        <input type="range" min={3} max={80} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        <button className="brick-btn c-orange size-s" onClick={() => setSeed((s) => s + 1)}>
          Seed {seed}
        </button>
      </div>
      <div className="scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))', gap: 12, paddingTop: 12 }}>
        {list.map(({ id, c }) => (
          <Card key={`${id}-${target}-${seed}`} id={id} c={c} />
        ))}
      </div>
    </div>
  );
}
