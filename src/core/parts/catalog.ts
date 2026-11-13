import type { Gender, PartId, Print } from '../types';

/**
 * Teile-Katalog.
 * Die Maße stammen aus den Teilenamen der Rebrickable-Datenbank (Feld `ref`).
 * Lokales Koordinatensystem: w = Noppen entlang x, l = Noppen entlang z, h = Halb-Ebenen.
 * Die „Vorderseite“ eines Teils zeigt nach +z (zur Kamera).
 */
export type PartKind = 'brick' | 'slope' | 'curved' | 'frame' | 'arch' | 'vehicle' | 'deco';
export type PartGroup = 'steine' | 'dach' | 'fenster' | 'fahrzeuge' | 'deko' | 'eigene';

/** [lx, lz] */
export type Cell2 = readonly [number, number];
/** [lx, ly (Halb-Ebene), lz] */
export type Cell3 = readonly [number, number, number];

export interface KidName {
  noun: string;
  gender: Gender;
  /** Adjektiv-Stämme vor der Farbe („groß“ → „den großen roten Stein“). */
  adjectives?: readonly string[];
}

export interface PartDef {
  id: PartId;
  kind: PartKind;
  group: PartGroup;
  /** Name für Eltern. */
  name: string;
  w: number;
  l: number;
  /** Höhe in Halb-Ebenen (normaler Stein = 2). */
  h: number;
  kid: KidName;
  colorable: boolean;
  prints?: readonly Print[];
  /** Darf nur direkt auf dem Boden stehen (Räder). */
  groundOnly?: boolean;
  /** Wie viele Noppen mindestens halten müssen (Standard 2). */
  minSupport?: number;
  /** Noppen oben (lokal). */
  studs?: 'all' | 'none' | readonly Cell2[];
  /** Auflageflächen unten (lokal). */
  bottom?: 'all' | readonly Cell2[];
  /** Unbelegte Zellen im Quader des Teils (z. B. die Öffnung unter einem Bogen). */
  holes?: readonly Cell3[];
  /** Rebrickable-Teilenummer als Referenz. */
  ref?: string;
  /** Nur bei eigenen Teilen: Foto als Data-URL. */
  photo?: string;
  /** Sortierung im Eltern-Editor. */
  order: number;
}

const brick = (
  wx: number,
  lz: number,
  adjectives: string[],
  ref: string,
  order: number,
  prints?: Print[],
): PartDef => ({
  id: `brick-2x${wx}`,
  kind: 'brick',
  group: 'steine',
  name: `Stein 2x${wx}`,
  w: wx,
  l: lz,
  h: 2,
  kid: { noun: 'Stein', gender: 'm', adjectives },
  colorable: true,
  prints,
  ref,
  order,
});

function archHoles(w: number): Cell3[] {
  const holes: Cell3[] = [];
  for (let lx = 1; lx < w - 1; lx++) {
    for (let ly = 0; ly < 2; ly++) {
      for (let lz = 0; lz < 2; lz++) holes.push([lx, ly, lz]);
    }
  }
  return holes;
}

const BACK_ROW_2: readonly Cell2[] = [
  [0, 0],
  [1, 0],
];

export const PARTS: readonly PartDef[] = [
  // ---- Steine ----
  brick(2, 2, ['klein'], '3437', 10, ['picture']),
  brick(3, 2, ['mittler'], '87084', 11),
  brick(4, 2, ['groß'], '3011', 12, ['eyes', 'picture']),
  brick(6, 2, ['lang'], '2300', 13),
  brick(8, 2, ['extralang'], '4199', 14),
  brick(10, 2, ['riesenlang'], '2291', 15),
  {
    id: 'tall-1x2',
    kind: 'brick',
    group: 'steine',
    name: 'Hoher Stein 1x2x2',
    w: 2,
    l: 1,
    h: 4,
    kid: { noun: 'Stein', gender: 'm', adjectives: ['schmal'] },
    colorable: true,
    ref: '4066',
    order: 20,
  },
  {
    id: 'tall-2x2',
    kind: 'brick',
    group: 'steine',
    name: 'Hoher Stein 2x2x2',
    w: 2,
    l: 2,
    h: 4,
    kid: { noun: 'Würfel', gender: 'm' },
    colorable: true,
    ref: '31110',
    order: 21,
  },
  {
    id: 'tall-2x4',
    kind: 'brick',
    group: 'steine',
    name: 'Hoher Stein 2x4x2',
    w: 4,
    l: 2,
    h: 4,
    kid: { noun: 'Stein', gender: 'm', adjectives: ['dick'] },
    colorable: true,
    ref: '31111',
    order: 22,
  },
  // ---- Dach & Rundsteine ----
  {
    id: 'slope-2x2',
    kind: 'slope',
    group: 'dach',
    name: 'Dachstein 2x2',
    w: 2,
    l: 2,
    h: 2,
    kid: { noun: 'Dachstein', gender: 'm' },
    colorable: true,
    studs: BACK_ROW_2,
    ref: '6474',
    order: 30,
  },
  {
    id: 'slope-2x2x2',
    kind: 'slope',
    group: 'dach',
    name: 'Hoher Dachstein 2x2x2',
    w: 2,
    l: 2,
    h: 4,
    kid: { noun: 'Dachstein', gender: 'm', adjectives: ['hoh'] },
    colorable: true,
    studs: BACK_ROW_2,
    ref: '70676',
    order: 31,
  },
  {
    id: 'curved-2x3',
    kind: 'curved',
    group: 'dach',
    name: 'Rundstein 2x3',
    w: 3,
    l: 2,
    h: 2,
    kid: { noun: 'Stein', gender: 'm', adjectives: ['rund'] },
    colorable: true,
    studs: 'none',
    prints: ['eyes'],
    ref: '2302',
    order: 32,
  },
  {
    id: 'curved-2x4',
    kind: 'curved',
    group: 'dach',
    name: 'Rundstein 2x4',
    w: 4,
    l: 2,
    h: 2,
    kid: { noun: 'Stein', gender: 'm', adjectives: ['lang', 'rund'] },
    colorable: true,
    studs: 'none',
    ref: '98223',
    order: 33,
  },
  // ---- Fenster, Türen, Bögen ----
  {
    id: 'door',
    kind: 'frame',
    group: 'fenster',
    name: 'Tür mit Rahmen 1x4x3',
    w: 4,
    l: 1,
    h: 6,
    kid: { noun: 'Tür', gender: 'f' },
    colorable: true,
    ref: '2332',
    order: 40,
  },
  {
    id: 'window',
    kind: 'frame',
    group: 'fenster',
    name: 'Fenster mit Rahmen 1x4x3',
    w: 4,
    l: 1,
    h: 6,
    kid: { noun: 'Fenster', gender: 'n' },
    colorable: true,
    ref: '4253',
    order: 41,
  },
  {
    id: 'arch-2x4',
    kind: 'arch',
    group: 'fenster',
    name: 'Bogen 2x4x2',
    w: 4,
    l: 2,
    h: 4,
    kid: { noun: 'Bogen', gender: 'm' },
    colorable: true,
    bottom: [
      [0, 0],
      [0, 1],
      [3, 0],
      [3, 1],
    ],
    holes: archHoles(4),
    ref: '11198',
    order: 42,
  },
  {
    id: 'arch-2x8',
    kind: 'arch',
    group: 'fenster',
    name: 'Großer Bogen 2x8x2',
    w: 8,
    l: 2,
    h: 4,
    kid: { noun: 'Bogen', gender: 'm', adjectives: ['groß'] },
    colorable: true,
    bottom: [
      [0, 0],
      [0, 1],
      [7, 0],
      [7, 1],
    ],
    holes: archHoles(8),
    ref: '18652',
    order: 43,
  },
  // ---- Fahrzeuge ----
  {
    id: 'car-2x6',
    kind: 'vehicle',
    group: 'fahrzeuge',
    name: 'Auto-Basis 2x6 mit Rädern',
    w: 6,
    l: 2,
    h: 2,
    kid: { noun: 'Auto', gender: 'n' },
    colorable: true,
    groundOnly: true,
    ref: '11841',
    order: 50,
  },
  {
    id: 'wagon-2x6',
    kind: 'vehicle',
    group: 'fahrzeuge',
    name: 'Zug-Wagen 2x6',
    w: 6,
    l: 2,
    h: 2,
    kid: { noun: 'Wagen', gender: 'm' },
    colorable: true,
    groundOnly: true,
    ref: '2032',
    order: 51,
  },
  // ---- Deko ----
  {
    id: 'flower',
    kind: 'deco',
    group: 'deko',
    name: 'Blume',
    w: 2,
    l: 2,
    h: 3,
    kid: { noun: 'Blume', gender: 'f' },
    colorable: true,
    studs: 'none',
    minSupport: 1,
    ref: '2390',
    order: 60,
  },
  {
    id: 'figure',
    kind: 'deco',
    group: 'deko',
    name: 'Figur (Mensch)',
    w: 2,
    l: 1,
    h: 5,
    kid: { noun: 'Figur', gender: 'f' },
    colorable: false,
    studs: 'none',
    order: 61,
  },
  {
    id: 'animal',
    kind: 'deco',
    group: 'deko',
    name: 'Tierfigur',
    w: 3,
    l: 2,
    h: 4,
    kid: { noun: 'Tier', gender: 'n' },
    colorable: false,
    studs: 'none',
    minSupport: 1,
    order: 62,
  },
  {
    id: 'seesaw',
    kind: 'deco',
    group: 'deko',
    name: 'Wippe 4x10',
    w: 10,
    l: 4,
    h: 3,
    kid: { noun: 'Wippe', gender: 'f' },
    colorable: true,
    groundOnly: true,
    studs: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [8, 1],
      [8, 2],
      [9, 1],
      [9, 2],
    ],
    ref: '62976',
    order: 63,
  },
];

const BUILTIN = new Map<PartId, PartDef>(PARTS.map((p) => [p.id, p]));
const custom = new Map<PartId, PartDef>();

/** Eigenes Teil, wie es im Bestand gespeichert wird. */
export interface CustomPartSpec {
  id: PartId;
  name: string;
  /** Noppen in x-Richtung. */
  w: number;
  /** Noppen in z-Richtung. */
  l: number;
  /** Höhe in Steinhöhen (1–4). */
  heightBricks: number;
  photo?: string;
}

export function customPartDef(spec: CustomPartSpec): PartDef {
  return {
    id: spec.id,
    kind: 'deco',
    group: 'eigene',
    name: spec.name,
    w: Math.max(1, Math.round(spec.w)),
    l: Math.max(1, Math.round(spec.l)),
    h: Math.max(1, Math.round(spec.heightBricks * 2)),
    kid: { noun: spec.name, gender: 'n' },
    colorable: false,
    studs: 'none',
    minSupport: 1,
    photo: spec.photo,
    order: 100,
  };
}

/** Eigene Teile bekannt machen (ersetzt die bisherigen). */
export function setCustomParts(specs: readonly CustomPartSpec[]): void {
  custom.clear();
  for (const s of specs) custom.set(s.id, customPartDef(s));
}

export function getPart(id: PartId): PartDef {
  const def = BUILTIN.get(id) ?? custom.get(id);
  if (!def) throw new Error(`Unbekanntes Teil: ${id}`);
  return def;
}

export function hasPart(id: PartId): boolean {
  return BUILTIN.has(id) || custom.has(id);
}

export function allParts(): PartDef[] {
  return [...PARTS, ...custom.values()].sort((a, b) => a.order - b.order);
}

export const GROUP_LABELS: Record<PartGroup, string> = {
  steine: 'Steine',
  dach: 'Dach & Rund',
  fenster: 'Fenster, Türen, Bögen',
  fahrzeuge: 'Fahrzeuge',
  deko: 'Deko & Figuren',
  eigene: 'Eigene Teile',
};

export function minSupportOf(def: PartDef): number {
  return def.minSupport ?? 2;
}
