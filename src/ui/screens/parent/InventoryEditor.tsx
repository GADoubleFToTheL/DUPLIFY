import { useMemo, useState } from 'react';
import { play } from '../../../audio/sfx';
import { COLORS } from '../../../core/colors';
import { totalParts, variantKey, parseVariantKey } from '../../../core/inventory';
import { GROUP_LABELS, allParts, getPart, hasPart, type PartDef, type PartGroup } from '../../../core/parts/catalog';
import type { ColorId, Print } from '../../../core/types';
import { useInventory } from '../../../state/inventoryStore';
import { useThumbnail } from '../../../three/useThumbnail';
import { IconMinus, IconPlus } from '../../components/icons';
import { partLabel } from '../../../i18n/speech';
import { ParentTop } from './ParentArea';

const GROUPS: PartGroup[] = ['steine', 'dach', 'fenster', 'fahrzeuge', 'deko'];

interface Variant {
  def: PartDef;
  print?: Print;
}

function variantsOf(group: PartGroup): Variant[] {
  const out: Variant[] = [];
  for (const def of allParts().filter((p) => p.group === group)) {
    out.push({ def });
    for (const pr of def.prints ?? []) out.push({ def, print: pr });
  }
  return out;
}

function variantName(v: Variant): string {
  if (v.print === 'eyes') return `${v.def.name} mit Augen`;
  if (v.print === 'picture') return `${v.def.name} mit Bild`;
  return v.def.name;
}

function Tile({ v, color, count, onAdd }: { v: Variant; color: ColorId | null; count: number; onAdd: (d: number) => void }) {
  const c = v.def.colorable ? color : null;
  const url = useThumbnail(`part:${v.def.id}:${c}:${v.print ?? ''}`, () => [{ part: v.def.id, x: 0, y: 0, z: 0, rot: 0, color: c, print: v.print }], {
    size: 160,
  });
  return (
    <div className={`inv-tile card ${count > 0 ? 'has' : ''}`} data-testid={`tile-${v.def.id}${v.print ? `-${v.print}` : ''}`}>
      <button className="inv-add" onClick={() => onAdd(1)} aria-label={`${variantName(v)} hinzufügen`}>
        {url ? <img src={url} alt="" draggable={false} /> : <div className="inv-img-ph" />}
        <span className="inv-name">{variantName(v)}</span>
        <span className="inv-plus">
          <IconPlus size={18} />
        </span>
      </button>
      <div className="inv-count-row">
        <button className="inv-minus" onClick={() => onAdd(-1)} disabled={count === 0} aria-label="eins weniger">
          <IconMinus size={18} />
        </button>
        <span className="inv-count" data-testid="count">
          {count}
        </span>
      </div>
    </div>
  );
}

/** Steine-Kiste: Farbe wählen, Teile antippen (+1). */
export function InventoryEditor() {
  const counts = useInventory((s) => s.counts);
  const add = useInventory((s) => s.add);
  const [group, setGroup] = useState<PartGroup | 'liste'>('steine');
  const [color, setColor] = useState<ColorId>('rot');
  const total = totalParts(counts);
  const variants = useMemo(() => (group === 'liste' ? [] : variantsOf(group)), [group]);
  const groupHasColor = variants.some((v) => v.def.colorable);
  const perColor = useMemo(() => {
    const m = new Map<ColorId, number>();
    for (const [k, n] of Object.entries(counts)) {
      const { color: c } = parseVariantKey(k);
      if (c) m.set(c, (m.get(c) ?? 0) + n);
    }
    return m;
  }, [counts]);

  const change = (v: Variant, d: number) => {
    const key = variantKey(v.def.id, v.def.colorable ? color : null, v.print);
    add(key, d);
    play(d > 0 ? 'pop' : 'tap');
  };

  return (
    <div className="screen parent inventory">
      <ParentTop title="Steine-Kiste" />
      <div className="inv-summary" data-testid="inv-total">
        {total} Teile in der Kiste
      </div>
      <div className="inv-groups" role="tablist">
        {GROUPS.map((g) => (
          <button key={g} role="tab" aria-selected={group === g} className={`seg ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>
            {GROUP_LABELS[g]}
          </button>
        ))}
        <button role="tab" aria-selected={group === 'liste'} className={`seg ${group === 'liste' ? 'active' : ''}`} onClick={() => setGroup('liste')}>
          Übersicht
        </button>
      </div>
      {group !== 'liste' && groupHasColor && (
        <div className="inv-colors" role="radiogroup" aria-label="Farbe">
          {COLORS.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={color === c.id}
              aria-label={c.name}
              className={`color-chip ${color === c.id ? 'active' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setColor(c.id)}
              data-testid={`color-${c.id}`}
            >
              {(perColor.get(c.id) ?? 0) > 0 && <span className="color-badge">{perColor.get(c.id)}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="scroll inv-grid">
        {group === 'liste' ? (
          <Overview />
        ) : (
          variants.map((v) => {
            const key = variantKey(v.def.id, v.def.colorable ? color : null, v.print);
            return <Tile key={`${v.def.id}-${v.print ?? ''}-${v.def.colorable ? color : ''}`} v={v} color={color} count={counts[key] ?? 0} onAdd={(d) => change(v, d)} />;
          })
        )}
      </div>
    </div>
  );
}

function Overview() {
  const counts = useInventory((s) => s.counts);
  const add = useInventory((s) => s.add);
  const entries = Object.entries(counts)
    .filter(([k, n]) => n > 0 && hasPart(parseVariantKey(k).part))
    .sort((a, b) => getPart(parseVariantKey(a[0]).part).order - getPart(parseVariantKey(b[0]).part).order || a[0].localeCompare(b[0]));
  if (entries.length === 0) return <div className="card parent-hint">Die Kiste ist noch leer.</div>;
  return (
    <div className="inv-list card">
      {entries.map(([k, n]) => {
        const { part, color, print } = parseVariantKey(k);
        return (
          <div key={k} className="inv-list-row">
            <span className="dot" style={{ background: color ? COLORS.find((c) => c.id === color)?.hex : '#ddd' }} />
            <span className="grow">{partLabel(part, color, print)}</span>
            <button className="inv-minus" onClick={() => add(k, -1)} aria-label="eins weniger">
              <IconMinus size={16} />
            </button>
            <b className="inv-count">{n}</b>
            <button className="inv-minus" onClick={() => add(k, 1)} aria-label="eins mehr">
              <IconPlus size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
