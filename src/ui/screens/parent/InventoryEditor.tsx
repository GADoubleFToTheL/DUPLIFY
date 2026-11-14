import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { play } from '../../../audio/sfx';
import { COLORS, COLOR_MAP } from '../../../core/colors';
import { parseVariantKey, totalParts, variantKey } from '../../../core/inventory';
import { GROUP_LABELS, getPart, hasPart, partNumber, type PartDef, type PartGroup } from '../../../core/parts/catalog';
import { catalogVariants, normalizeSearch, searchVariants, variantName, type CatalogVariant } from '../../../core/parts/search';
import type { ColorId, Print } from '../../../core/types';
import { useInventory } from '../../../state/inventoryStore';
import { IconMinus, IconPlus } from '../../components/icons';
import { PartThumbnail } from '../../components/PartThumbnail';
import { ParentTop } from './ParentArea';

type View = 'haeufig' | PartGroup | 'liste';

const GROUP_ORDER: PartGroup[] = ['steine', 'platten', 'dach', 'boegen', 'fenster', 'fahrzeuge', 'zug', 'gebaeude', 'zubehoer', 'deko', 'eigene'];

const keyOf = (v: { def: PartDef; print?: Print }, color: ColorId) => variantKey(v.def.id, v.def.colorable ? color : null, v.print);

const Tile = memo(function Tile({ v, color, count, onAdd }: { v: CatalogVariant; color: ColorId; count: number; onAdd: (key: string, d: number) => void }) {
  const c = v.def.colorable ? color : null;
  const nr = partNumber(v.def);
  const key = keyOf(v, color);
  return (
    <div className={`inv-tile card ${count > 0 ? 'has' : ''}`} data-testid={`tile-${v.def.id}${v.print ? `-${v.print}` : ''}`}>
      <button className="inv-add" onClick={() => onAdd(key, 1)} aria-label={`${variantName(v)} hinzufügen`} title={variantName(v)}>
        <PartThumbnail part={v.def.id} color={c} print={v.print} size={160} className="inv-img" />
        <span className="inv-name">{variantName(v)}</span>
        <span className="inv-nr">{nr ? `Nr. ${nr}` : v.def.group === 'eigene' ? 'eigenes Teil' : 'gezeichnet'}</span>
        <span className="inv-plus">
          <IconPlus size={18} />
        </span>
      </button>
      <div className="inv-count-row">
        <button className="inv-minus" onClick={() => onAdd(key, -1)} disabled={count === 0} aria-label="eins weniger">
          <IconMinus size={18} />
        </button>
        <span className="inv-count" data-testid="count">
          {count}
        </span>
      </div>
    </div>
  );
});

/** Steine-Kiste: Kategorie oder Suche wählen, Farbe wählen, Teile antippen (+1). */
export function InventoryEditor() {
  const counts = useInventory((s) => s.counts);
  const custom = useInventory((s) => s.custom);
  const add = useInventory((s) => s.add);
  const [view, setView] = useState<View>('haeufig');
  const [color, setColor] = useState<ColorId>('rot');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const total = totalParts(counts);

  // Eigene Teile (custom) ändern den Katalog.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const variants = useMemo(() => catalogVariants(), [custom]);
  const groupCounts = useMemo(() => {
    const m = new Map<PartGroup, number>();
    for (const v of variants) m.set(v.def.group, (m.get(v.def.group) ?? 0) + 1);
    return m;
  }, [variants]);

  const searching = normalizeSearch(deferredQuery) !== '';
  const shown = useMemo(() => {
    if (normalizeSearch(deferredQuery)) return searchVariants(variants, deferredQuery);
    if (view === 'liste') return [];
    if (view === 'haeufig') return variants.filter((v) => v.def.common);
    return variants.filter((v) => v.def.group === view);
  }, [variants, view, deferredQuery]);
  const plain = shown.filter((v) => !(v.def.printed || v.print));
  const printed = shown.filter((v) => v.def.printed || v.print);
  const showColors = (searching || view !== 'liste') && shown.some((v) => v.def.colorable);

  const perColor = useMemo(() => {
    const m = new Map<ColorId, number>();
    for (const [k, n] of Object.entries(counts)) {
      const { color: c } = parseVariantKey(k);
      if (c) m.set(c, (m.get(c) ?? 0) + n);
    }
    return m;
  }, [counts]);

  const change = useCallback(
    (key: string, d: number) => {
      add(key, d);
      play(d > 0 ? 'pop' : 'tap');
    },
    [add],
  );

  const tabs: View[] = ['haeufig', ...GROUP_ORDER.filter((g) => (groupCounts.get(g) ?? 0) > 0), 'liste'];
  const tabLabel = (t: View) => (t === 'haeufig' ? 'Häufige Teile' : t === 'liste' ? 'In der Kiste' : GROUP_LABELS[t]);
  const tile = (v: CatalogVariant) => (
    <Tile key={`${v.def.id}-${v.print ?? ''}`} v={v} color={color} count={counts[keyOf(v, color)] ?? 0} onAdd={change} />
  );

  return (
    <div className="screen parent inventory">
      <ParentTop title="Steine-Kiste" />
      <div className="inv-summary" data-testid="inv-total">
        {total} Teile in der Kiste
      </div>
      <div className="inv-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen: 2x4, Bogen, Tür, 3011 …"
          aria-label="Teile suchen"
          data-testid="inv-search"
          enterKeyHint="search"
        />
        {query && (
          <button className="inv-search-clear" onClick={() => setQuery('')} aria-label="Suche löschen">
            ✕
          </button>
        )}
      </div>
      {!searching && (
        <div className="inv-groups" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={view === t}
              className={`seg ${view === t ? 'active' : ''}`}
              onClick={() => setView(t)}
              data-testid={`inv-cat-${t}`}
            >
              {tabLabel(t)}
              {t !== 'haeufig' && t !== 'liste' && <span className="seg-count">{groupCounts.get(t)}</span>}
            </button>
          ))}
        </div>
      )}
      {showColors && (
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
      <div className="scroll inv-grid" key={searching ? 'suche' : view}>
        {!searching && view === 'liste' ? (
          <Overview />
        ) : shown.length === 0 ? (
          <div className="card parent-hint inv-empty">
            Nichts gefunden. Tipp: nach Maßen („2x4“), Namen („Bogen“, „Fenster“) oder der Nummer auf dem Teil suchen.
          </div>
        ) : (
          <>
            {searching && <div className="inv-heading">{shown.length} Treffer</div>}
            {plain.map(tile)}
            {printed.length > 0 && (
              <div className="inv-heading">
                Mit Aufdruck <span className="subtle">({printed.length})</span>
              </div>
            )}
            {printed.map(tile)}
          </>
        )}
      </div>
    </div>
  );
}

/** Alles, was in der Kiste liegt – mit Plus/Minus. */
function Overview() {
  const counts = useInventory((s) => s.counts);
  const add = useInventory((s) => s.add);
  const entries = Object.entries(counts)
    .filter(([k, n]) => n > 0 && hasPart(parseVariantKey(k).part))
    .sort((a, b) => getPart(parseVariantKey(a[0]).part).order - getPart(parseVariantKey(b[0]).part).order || a[0].localeCompare(b[0]));
  if (entries.length === 0) return <div className="card parent-hint inv-empty">Die Kiste ist noch leer.</div>;
  return (
    <div className="inv-list card">
      {entries.map(([k, n]) => {
        const { part, color, print } = parseVariantKey(k);
        const def = getPart(part);
        const c = color ? COLOR_MAP.get(color) : undefined;
        return (
          <div key={k} className="inv-list-row">
            <PartThumbnail part={part} color={color} print={print ?? undefined} size={160} className="inv-list-img" />
            <span className="grow">
              {variantName({ def, print: print ?? undefined })}
              {c && <span className="subtle small block">{c.name}</span>}
            </span>
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
