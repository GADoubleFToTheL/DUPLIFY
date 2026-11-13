import { rotateLocal } from './grid';
import { getPart, hasPart } from './parts/catalog';
import type { PartId, Placement } from './types';

/** Wie sich ein Teil in kleinere zerlegen lässt (lokal entlang x, volle Tiefe). */
const SPLITS: Record<PartId, { part: PartId; lx: number; dy: number }[]> = {
  'brick-2x4': [
    { part: 'brick-2x2', lx: 0, dy: 0 },
    { part: 'brick-2x2', lx: 2, dy: 0 },
  ],
  'brick-2x6': [
    { part: 'brick-2x4', lx: 0, dy: 0 },
    { part: 'brick-2x2', lx: 4, dy: 0 },
  ],
  'brick-2x8': [
    { part: 'brick-2x4', lx: 0, dy: 0 },
    { part: 'brick-2x4', lx: 4, dy: 0 },
  ],
  'brick-2x10': [
    { part: 'brick-2x6', lx: 0, dy: 0 },
    { part: 'brick-2x4', lx: 6, dy: 0 },
  ],
  'tall-2x2': [
    { part: 'brick-2x2', lx: 0, dy: 0 },
    { part: 'brick-2x2', lx: 0, dy: 2 },
  ],
  'tall-2x4': [
    { part: 'brick-2x4', lx: 0, dy: 0 },
    { part: 'brick-2x4', lx: 0, dy: 2 },
  ],
};

export function canSplit(p: Placement): boolean {
  return !!SPLITS[p.part] && p.print !== 'eyes';
}

/** Ersetzt ein Teil durch kleinere Teile an exakt derselben Stelle. */
export function splitPlacement(p: Placement): Placement[] | null {
  const rule = SPLITS[p.part];
  if (!rule || p.print === 'eyes') return null;
  const def = getPart(p.part);
  return rule.map(({ part, lx, dy }) => {
    if (!hasPart(part)) throw new Error(`Ersatzteil fehlt: ${part}`);
    const sub = getPart(part);
    const [ax, az] = rotateLocal(def, p.rot, lx, 0);
    const [bx, bz] = rotateLocal(def, p.rot, lx + sub.w - 1, sub.l - 1);
    return {
      ...p,
      part,
      print: undefined,
      x: p.x + Math.min(ax, bx),
      z: p.z + Math.min(az, bz),
      y: p.y + dy,
    };
  });
}

/** Zerlegt alle zerlegbaren Teile einer Farbrolle. */
export function splitRole(placements: readonly Placement[], role: string): Placement[] {
  const out: Placement[] = [];
  for (const p of placements) {
    const parts = p.role === role ? splitPlacement(p) : null;
    if (parts) out.push(...parts);
    else out.push(p);
  }
  return out;
}
