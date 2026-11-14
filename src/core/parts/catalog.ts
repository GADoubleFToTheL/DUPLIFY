import type { Gender, PartId, Print, Rot } from '../types';
import ldrawJson from './ldraw-catalog.json';

/**
 * Teile-Katalog.
 * Maße, Noppen und 3D-Modelle stammen aus der LDraw-Bibliothek (CC BY 4.0, siehe
 * scripts/ldraw/convert.mjs). Die Baupläne nutzen die bekannten Teile (`brick-2x4` …),
 * die auf echte Teile abgebildet sind; alle übrigen Duplo-Teile heißen `ld-<nummer>`.
 * Lokales Koordinatensystem: w = Noppen entlang x, l = Noppen entlang z, h = Halb-Ebenen.
 * Die „Vorderseite“ eines Teils zeigt nach +z (zur Kamera).
 */
export type PartKind = 'brick' | 'plate' | 'slope' | 'curved' | 'frame' | 'arch' | 'vehicle' | 'deco';
export type PartGroup =
  | 'steine'
  | 'platten'
  | 'dach'
  | 'boegen'
  | 'fenster'
  | 'fahrzeuge'
  | 'zug'
  | 'gebaeude'
  | 'zubehoer'
  | 'deko'
  | 'eigene';

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
  /** Originalgetreues 3D-Modell (LDraw-Nummer) und seine Grund-Drehung. */
  ldraw?: { file: string; rot: Rot };
  /** Englischer Originalname (LDraw). */
  en?: string;
  /** Kein Originalmodell vorhanden – von Duplify gezeichnet. */
  drawn?: boolean;
  /** Häufiges Teil (wird in der Steine-Kiste zuerst gezeigt und von Bauplänen genutzt). */
  common?: boolean;
  /** Originalteil mit Aufdruck. */
  printed?: boolean;
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

const BASE_PARTS: PartDef[] = [
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
    name: 'Tür mit Rahmen 2x4x3',
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
    name: 'Fenster mit Rahmen 2x4x3',
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
    name: 'Auto-Basis 2x6 mit Röhre unten (Wagen)',
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

// ---------- Originalgetreue Teile (LDraw) ----------

interface LdrawEntry {
  id: string;
  en: string;
  de: string;
  cat: PartGroup;
  kind: PartKind;
  w: number;
  l: number;
  h: number;
  studs: 'all' | number[][];
  tubes: number;
  ground?: boolean;
  printed?: boolean;
  fixed?: string[];
  noMain?: boolean;
  tris: number;
  kb: number;
}

const LDRAW_DATA = (ldrawJson as unknown as { parts: LdrawEntry[] }).parts;
const LDRAW = new Map(LDRAW_DATA.map((e) => [e.id, e]));

/** Bekannte Teile → echtes LDraw-Teil (mit Grund-Drehung, damit Vorderseite/Noppen zur App passen). */
const GENERIC_LDRAW: Record<PartId, { file: string; rot: Rot; group?: PartGroup }> = {
  'brick-2x2': { file: '3437', rot: 0 },
  'brick-2x3': { file: '87084', rot: 0 },
  'brick-2x4': { file: '3011', rot: 0 },
  'brick-2x6': { file: '2300', rot: 0 },
  'brick-2x8': { file: '4199', rot: 0 },
  'brick-2x10': { file: '2291', rot: 0 },
  'tall-1x2': { file: '4066a', rot: 0 },
  'tall-2x2': { file: '31110', rot: 0 },
  'tall-2x4': { file: '31111', rot: 0 },
  'slope-2x2': { file: '6474', rot: 2 },
  'slope-2x2x2': { file: '70676', rot: 2 },
  'curved-2x3': { file: '2302b', rot: 1, group: 'boegen' },
  'curved-2x4': { file: '98223b', rot: 1, group: 'boegen' },
  door: { file: 'x-door', rot: 2 },
  window: { file: 'x-window', rot: 2 },
  'arch-2x4': { file: '11198', rot: 0, group: 'boegen' },
  'arch-2x8': { file: '18652', rot: 0, group: 'boegen' },
  'car-2x6': { file: '10715', rot: 1 },
  'wagon-2x6': { file: '14639', rot: 1 },
};

/** Zelle eines Teils mit Grundfläche w×l nach Drehung (gleiche Formel wie grid.rotateLocal). */
export function rotateCell(lx: number, lz: number, w: number, l: number, rot: Rot): [number, number] {
  switch (rot) {
    case 0:
      return [lx, lz];
    case 1:
      return [l - 1 - lz, lx];
    case 2:
      return [w - 1 - lx, l - 1 - lz];
    case 3:
      return [lz, w - 1 - lx];
  }
}

function withLdraw(def: PartDef): PartDef {
  const m = GENERIC_LDRAW[def.id];
  const e = m ? LDRAW.get(m.file) : undefined;
  if (!m || !e) return { ...def, drawn: true, common: true };
  const odd = m.rot % 2 === 1;
  const studs: PartDef['studs'] =
    e.studs === 'all' ? 'all' : e.studs.length === 0 ? 'none' : e.studs.map(([x, z]) => rotateCell(x, z, e.w, e.l, m.rot));
  return {
    ...def,
    w: odd ? e.l : e.w,
    l: odd ? e.w : e.l,
    h: e.h,
    studs,
    groundOnly: def.groundOnly || !!e.ground,
    group: m.group ?? def.group,
    ldraw: { file: m.file, rot: m.rot },
    en: e.en,
    common: true,
  };
}

export const PARTS: readonly PartDef[] = BASE_PARTS.map(withLdraw);

const MAPPED = new Set(Object.values(GENERIC_LDRAW).map((m) => m.file));
const CAT_NOUN: Record<string, KidName> = {
  steine: { noun: 'Stein', gender: 'm' },
  platten: { noun: 'Platte', gender: 'f' },
  dach: { noun: 'Dachstein', gender: 'm' },
  boegen: { noun: 'Stein', gender: 'm', adjectives: ['rund'] },
  fenster: { noun: 'Fenster', gender: 'n' },
  fahrzeuge: { noun: 'Fahrzeugteil', gender: 'n' },
  zug: { noun: 'Zugteil', gender: 'n' },
  gebaeude: { noun: 'Gebäudeteil', gender: 'n' },
  zubehoer: { noun: 'Teil', gender: 'n' },
};

/** Weitere Teile, die in vielen Familien-Kisten liegen (stehen in der Steine-Kiste mit oben). */
const COMMON_LDRAW = new Set([
  '40666', // Platte 2 x 4
  '98233', // Platte 2 x 6
  '44524', // Platte 2 x 8
  '14721', // Platte 4 x 4
  '51262', // Platte 8 x 8
  '6490', // Platte 8 x 16
  '5930', // Grundplatte 16 x 16
  '4268', // Grundplatte 24 x 24
  '3664', // Stein 2 x 2 x 2 mit gewölbter Oberseite
  '31213b', // Stein 2 x 4 x 2 mit gewölbter Oberseite
  '4198', // Stein 2 x 4 x 2 mit runden Enden
  '11170', // Stein 2 x 2 x 1.5 mit gebogener Front
  '63871', // Schräge 2 x 3 x 2
]);

/** Alle weiteren echten Duplo-Teile aus der LDraw-Bibliothek. */
export const LDRAW_PARTS: readonly PartDef[] = LDRAW_DATA.filter((e) => !MAPPED.has(e.id) && !e.id.startsWith('x-')).map(
  (e, i): PartDef => ({
    id: `ld-${e.id}`,
    kind: e.kind,
    group: e.cat,
    name: e.de,
    en: e.en,
    common: COMMON_LDRAW.has(e.id) || undefined,
    printed: e.printed || undefined,
    w: e.w,
    l: e.l,
    h: e.h,
    kid: CAT_NOUN[e.cat] ?? { noun: 'Teil', gender: 'n' },
    colorable: !e.noMain,
    groundOnly: !!e.ground,
    minSupport: e.kind === 'deco' ? 1 : 2,
    // Grund-Drehung 180°: In LDraw zeigt die Vorderseite (mit Aufdruck) nach −z, in der App nach +z.
    studs: e.studs === 'all' ? 'all' : e.studs.length ? e.studs.map(([x, z]) => rotateCell(x, z, e.w, e.l, 2)) : 'none',
    ldraw: { file: e.id, rot: 2 },
    order: 1000 + i,
  }),
);

/** Zusammengesetzte Teile (Rahmen + Einsatz) → die Nummern der echten Einzelteile. */
const VIRTUAL_NUMBERS: Record<string, string> = { 'x-door': '4253c01 + 18816', 'x-window': '4253c01 + 90265' };

/** Teilenummer (LDraw/LEGO-Formnummer) für Eltern und Suche; null bei gezeichneten und eigenen Teilen. */
export function partNumber(def: PartDef): string | null {
  const f = def.ldraw?.file;
  if (!f) return null;
  return VIRTUAL_NUMBERS[f] ?? f;
}

/** Größe des 3D-Modells in KB (für Eltern-Infos). */
export function modelSizeKb(file: string): number {
  return LDRAW.get(file)?.kb ?? 0;
}

const BUILTIN = new Map<PartId, PartDef>([...PARTS, ...LDRAW_PARTS].map((p) => [p.id, p]));
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
  return [...PARTS, ...LDRAW_PARTS, ...custom.values()].sort((a, b) => a.order - b.order);
}

export const GROUP_LABELS: Record<PartGroup, string> = {
  steine: 'Steine',
  platten: 'Platten',
  dach: 'Dach & Schrägen',
  boegen: 'Bögen & Rundes',
  fenster: 'Fenster & Türen',
  fahrzeuge: 'Fahrzeuge & Räder',
  zug: 'Zug',
  gebaeude: 'Gebäude',
  zubehoer: 'Pflanzen & Zubehör',
  deko: 'Figuren & Tiere',
  eigene: 'Eigene Teile',
};

export function minSupportOf(def: PartDef): number {
  return def.minSupport ?? 2;
}
