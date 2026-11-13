import { COLOR_IDS } from './colors';
import { getPart, hasPart } from './parts/catalog';
import type { ColorId, PartId, Placement, Print } from './types';

/** Schlüssel einer Teil-Variante im Bestand: Teil | Farbe | Aufdruck. */
export type VariantKey = string;
export type Counts = Record<VariantKey, number>;

export function variantKey(part: PartId, color: ColorId | null, print?: Print | null): VariantKey {
  return `${part}|${color ?? '-'}|${print ?? ''}`;
}

export function parseVariantKey(key: VariantKey): { part: PartId; color: ColorId | null; print: Print | null } {
  const [part, color, print] = key.split('|');
  return {
    part,
    color: color === '-' ? null : (color as ColorId),
    print: print ? (print as Print) : null,
  };
}

/** Bauform unabhängig von der Farbe. Bildsteine zählen wie normale Steine, Augensteine extra. */
export function shapeKey(part: PartId, print?: Print | null): string {
  return print === 'eyes' ? `${part}|eyes` : part;
}

export function demandOf(placements: readonly Placement[]): Map<VariantKey, number> {
  const m = new Map<VariantKey, number>();
  for (const p of placements) {
    const k = variantKey(p.part, p.color, p.print);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export interface Missing {
  key: VariantKey;
  need: number;
  have: number;
}

export function missingParts(counts: Counts, placements: readonly Placement[]): Missing[] {
  const out: Missing[] = [];
  for (const [key, need] of demandOf(placements)) {
    const have = counts[key] ?? 0;
    if (have < need) out.push({ key, need, have });
  }
  return out;
}

export function canBuild(counts: Counts, placements: readonly Placement[]): boolean {
  return missingParts(counts, placements).length === 0;
}

export function totalParts(counts: Counts): number {
  let n = 0;
  for (const [k, v] of Object.entries(counts)) if (v > 0 && hasPart(parseVariantKey(k).part)) n += v;
  return n;
}

/** Wie viele Teile jeder Bauform (über alle Farben) vorhanden sind. */
export function shapeTotals(counts: Counts): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(counts)) {
    if (v <= 0) continue;
    const { part, print } = parseVariantKey(k);
    if (!hasPart(part)) continue;
    const s = shapeKey(part, print);
    m.set(s, (m.get(s) ?? 0) + v);
  }
  return m;
}

/** Entfernt leere und unbekannte Einträge. */
export function cleanCounts(counts: Counts): Counts {
  const out: Counts = {};
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0 && Number.isFinite(v) && hasPart(parseVariantKey(k).part)) out[k] = Math.floor(v);
  }
  return out;
}

export function addCount(counts: Counts, key: VariantKey, delta: number): Counts {
  const next = Math.max(0, (counts[key] ?? 0) + delta);
  const out = { ...counts };
  if (next === 0) delete out[key];
  else out[key] = next;
  return out;
}

/** Beispiel-Kiste: eine typische, gut gemischte Sammlung zum Ausprobieren. */
export function sampleCounts(): Counts {
  const c: Counts = {};
  const add = (part: PartId, color: ColorId | null, n: number, print?: Print) => {
    if (n > 0) c[variantKey(part, color, print)] = (c[variantKey(part, color, print)] ?? 0) + n;
  };
  const main: ColorId[] = ['rot', 'gelb', 'blau', 'gruen', 'orange', 'hellgruen', 'weiss', 'hellblau', 'pink', 'lila'];
  main.forEach((col, i) => {
    add('brick-2x4', col, 8 - (i % 3));
    add('brick-2x2', col, 6 - (i % 2));
    if (i % 2 === 0) add('brick-2x6', col, 2);
    if (i % 3 === 0) add('brick-2x3', col, 2);
    if (i < 6) add('tall-2x2', col, 1);
  });
  add('tall-1x2', 'rot', 2);
  add('tall-1x2', 'blau', 2);
  add('brick-2x8', 'rot', 1);
  add('brick-2x8', 'blau', 1);
  add('slope-2x2', 'rot', 6);
  add('slope-2x2', 'blau', 4);
  add('slope-2x2', 'gruen', 2);
  add('curved-2x3', 'gelb', 2);
  add('curved-2x3', 'gelb', 1, 'eyes');
  add('brick-2x4', 'gelb', 1, 'eyes');
  add('brick-2x4', 'gruen', 1, 'eyes');
  add('brick-2x2', 'weiss', 2, 'picture');
  add('door', 'rot', 1);
  add('window', 'weiss', 2);
  add('arch-2x4', 'rot', 1);
  add('arch-2x4', 'blau', 1);
  add('car-2x6', 'rot', 1);
  add('wagon-2x6', 'blau', 2);
  add('flower', 'gelb', 2);
  add('flower', 'rot', 1);
  add('figure', null, 3);
  add('animal', null, 2);
  add('seesaw', 'rot', 1);
  return c;
}

/** Für Tests und Debug: alle Farben gleich oft. */
export function uniformCounts(parts: PartId[], perColor: number, colors: readonly ColorId[] = COLOR_IDS): Counts {
  const c: Counts = {};
  for (const part of parts) {
    const def = getPart(part);
    if (!def.colorable) c[variantKey(part, null)] = perColor;
    else for (const col of colors) c[variantKey(part, col)] = perColor;
  }
  return c;
}
