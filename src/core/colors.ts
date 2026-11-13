import type { ColorId, Gender } from './types';

export interface ColorDef {
  id: ColorId;
  /** Anzeigename für Eltern. */
  name: string;
  /** Farbwert zum Rendern (angelehnt an die Rebrickable-Farbtabelle). */
  hex: string;
  /** Adjektiv-Stamm für die Sprachausgabe („rot“ → „den roten Stein“). */
  stem: string;
  /** Unveränderliche Farbwörter („lila“, „rosa“). */
  invariable?: boolean;
}

export const COLORS: readonly ColorDef[] = [
  { id: 'rot', name: 'Rot', hex: '#C91A09', stem: 'rot' },
  { id: 'orange', name: 'Orange', hex: '#FE8A18', stem: 'orange' },
  { id: 'gelb', name: 'Gelb', hex: '#F2CD37', stem: 'gelb' },
  { id: 'hellgruen', name: 'Hellgrün', hex: '#BBE90B', stem: 'hellgrün' },
  { id: 'gruen', name: 'Grün', hex: '#4B9F4A', stem: 'grün' },
  { id: 'dunkelgruen', name: 'Dunkelgrün', hex: '#237841', stem: 'dunkelgrün' },
  { id: 'tuerkis', name: 'Türkis', hex: '#36AEBF', stem: 'türkis' },
  { id: 'hellblau', name: 'Hellblau', hex: '#078BC9', stem: 'hellblau' },
  { id: 'blau', name: 'Blau', hex: '#0055BF', stem: 'blau' },
  { id: 'lila', name: 'Lila', hex: '#AC78BA', stem: 'lila', invariable: true },
  { id: 'rosa', name: 'Rosa', hex: '#E4ADC8', stem: 'rosa', invariable: true },
  { id: 'pink', name: 'Pink', hex: '#C870A0', stem: 'pink' },
  { id: 'braun', name: 'Braun', hex: '#6B3A1E', stem: 'braun' },
  { id: 'beige', name: 'Beige', hex: '#E4CD9E', stem: 'beige' },
  { id: 'weiss', name: 'Weiß', hex: '#F4F4F2', stem: 'weiß' },
  { id: 'grau', name: 'Grau', hex: '#A0A5A9', stem: 'grau' },
  { id: 'schwarz', name: 'Schwarz', hex: '#1E2731', stem: 'schwarz' },
];

export const COLOR_MAP: ReadonlyMap<ColorId, ColorDef> = new Map(COLORS.map((c) => [c.id, c]));
export const COLOR_IDS: readonly ColorId[] = COLORS.map((c) => c.id);

/** Regenbogen-Reihenfolge für bunte Türme. */
export const RAINBOW: readonly ColorId[] = [
  'rot',
  'orange',
  'gelb',
  'hellgruen',
  'gruen',
  'tuerkis',
  'hellblau',
  'blau',
  'lila',
  'pink',
  'rosa',
];

export function colorHex(id: ColorId | null | undefined): string {
  return (id && COLOR_MAP.get(id)?.hex) || '#cccccc';
}

/**
 * Adjektiv im Akkusativ nach bestimmtem Artikel:
 * den roten (m) · die rote (f) · das rote (n). Unveränderlich: lila, rosa.
 */
export function declineAdjective(stem: string, gender: Gender, invariable = false): string {
  if (invariable) return stem;
  return gender === 'm' ? `${stem}en` : `${stem}e`;
}

export function colorAdjective(id: ColorId, gender: Gender): string {
  const def = COLOR_MAP.get(id);
  if (!def) return '';
  return declineAdjective(def.stem, gender, def.invariable);
}
