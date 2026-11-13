import type { Placement } from './types';

/** Kleines Beispiel-Bauwerk für die Entwickler-Seiten. */
export const SAMPLE_PLACEMENTS: Placement[] = [
  { part: 'brick-2x4', x: 0, y: 0, z: 0, rot: 0, color: 'rot' },
  { part: 'brick-2x4', x: 1, y: 2, z: -1, rot: 1, color: 'orange' },
  { part: 'brick-2x4', x: 0, y: 4, z: 0, rot: 0, color: 'gelb' },
  { part: 'brick-2x4', x: 1, y: 6, z: -1, rot: 1, color: 'gruen' },
  { part: 'brick-2x4', x: 0, y: 8, z: 0, rot: 0, color: 'gelb', print: 'eyes' },
  { part: 'flower', x: 1, y: 10, z: 0, rot: 0, color: 'rot' },
  { part: 'car-2x6', x: 6, y: 0, z: 0, rot: 0, color: 'blau' },
  { part: 'figure', x: 8, y: 2, z: 0, rot: 0, color: null },
  { part: 'arch-2x4', x: -7, y: 0, z: 0, rot: 0, color: 'blau' },
  { part: 'slope-2x2', x: -7, y: 4, z: 0, rot: 0, color: 'rot' },
  { part: 'slope-2x2', x: -5, y: 4, z: 0, rot: 0, color: 'rot' },
];
