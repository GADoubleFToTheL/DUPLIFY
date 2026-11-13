import { getPart, hasPart, minSupportOf } from './parts/catalog';
import { bottomCells, cellKey, columnKey, footprintCells, occupiedCells, studCells } from './grid';
import type { Placement } from './types';

export type IssueCode = 'unknownPart' | 'belowGround' | 'overlap' | 'groundOnly' | 'floating' | 'tipping';

export interface Issue {
  index: number;
  code: IssueCode;
  other?: number;
}

export interface ValidateOptions {
  /** Mit Grundplatte kann nichts umkippen. */
  baseplate?: boolean;
  /** Kipp-Prüfung (Standard: an). */
  checkTipping?: boolean;
}

export interface Analysis {
  issues: Issue[];
  /** supports[i] = Teile, auf denen Teil i steht. */
  supports: number[][];
}

/** Prüft ein Bauwerk: Überlappung, Halt auf Noppen, Boden-Teile und Kippen. */
export function analyze(placements: readonly Placement[], opts: ValidateOptions = {}): Analysis {
  const issues: Issue[] = [];
  const supports: number[][] = placements.map(() => []);
  const occupancy = new Map<string, number>();
  const studs = new Map<string, number>();

  placements.forEach((p, i) => {
    if (!hasPart(p.part)) {
      issues.push({ index: i, code: 'unknownPart' });
      return;
    }
    if (p.y < 0) issues.push({ index: i, code: 'belowGround' });
    for (const c of occupiedCells(p)) {
      const k = cellKey(c.x, c.y, c.z);
      const other = occupancy.get(k);
      if (other !== undefined && other !== i) {
        if (!issues.some((is) => is.code === 'overlap' && is.index === i && is.other === other)) {
          issues.push({ index: i, code: 'overlap', other });
        }
      } else {
        occupancy.set(k, i);
      }
    }
    for (const s of studCells(p)) studs.set(cellKey(s.x, s.y, s.z), i);
  });

  placements.forEach((p, i) => {
    if (!hasPart(p.part)) return;
    const def = getPart(p.part);
    if (def.groundOnly && p.y !== 0) {
      issues.push({ index: i, code: 'groundOnly' });
      return;
    }
    if (p.y === 0) return;
    const bottom = bottomCells(p);
    const on = new Set<number>();
    let held = 0;
    for (const c of bottom) {
      const s = studs.get(cellKey(c.x, p.y, c.z));
      if (s !== undefined && s !== i) {
        held++;
        on.add(s);
      }
    }
    supports[i] = [...on];
    if (held < Math.min(minSupportOf(def), bottom.length)) issues.push({ index: i, code: 'floating' });
  });

  if (opts.checkTipping !== false && !opts.baseplate && issues.length === 0) {
    issues.push(...tippingIssues(placements, supports));
  }
  return { issues, supports };
}

export function validate(placements: readonly Placement[], opts?: ValidateOptions): Issue[] {
  return analyze(placements, opts).issues;
}

export function isValid(placements: readonly Placement[], opts?: ValidateOptions): boolean {
  return validate(placements, opts).length === 0;
}

/** Schwerpunkt jedes zusammenhängenden Teils muss über seiner Standfläche liegen. */
function tippingIssues(placements: readonly Placement[], supports: number[][]): Issue[] {
  const parent = placements.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  supports.forEach((list, i) => list.forEach((j) => (parent[find(i)] = find(j))));

  interface Acc {
    mass: number;
    sx: number;
    sz: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    first: number;
  }
  const comps = new Map<number, Acc>();
  placements.forEach((p, i) => {
    const r = find(i);
    let a = comps.get(r);
    if (!a) {
      a = { mass: 0, sx: 0, sz: 0, minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, first: i };
      comps.set(r, a);
    }
    for (const c of occupiedCells(p)) {
      a.mass++;
      a.sx += c.x + 0.5;
      a.sz += c.z + 0.5;
    }
    if (p.y === 0) {
      for (const c of footprintCells(p)) {
        a.minX = Math.min(a.minX, c.x);
        a.maxX = Math.max(a.maxX, c.x + 1);
        a.minZ = Math.min(a.minZ, c.z);
        a.maxZ = Math.max(a.maxZ, c.z + 1);
      }
    }
  });

  const out: Issue[] = [];
  for (const a of comps.values()) {
    if (a.mass === 0) continue;
    const cx = a.sx / a.mass;
    const cz = a.sz / a.mass;
    const eps = 0.05;
    if (cx < a.minX - eps || cx > a.maxX + eps || cz < a.minZ - eps || cz > a.maxZ + eps) {
      out.push({ index: a.first, code: 'tipping' });
    }
  }
  return out;
}

/** Für jede Säule (x,z): welche Teile liegen übereinander (von unten nach oben). */
export function columnStacks(placements: readonly Placement[]): Map<string, { index: number; minY: number; maxY: number }[]> {
  const cols = new Map<string, Map<number, { index: number; minY: number; maxY: number }>>();
  placements.forEach((p, i) => {
    for (const c of occupiedCells(p)) {
      const k = columnKey(c.x, c.z);
      let m = cols.get(k);
      if (!m) {
        m = new Map();
        cols.set(k, m);
      }
      const e = m.get(i);
      if (e) {
        e.minY = Math.min(e.minY, c.y);
        e.maxY = Math.max(e.maxY, c.y);
      } else m.set(i, { index: i, minY: c.y, maxY: c.y });
    }
  });
  const out = new Map<string, { index: number; minY: number; maxY: number }[]>();
  for (const [k, m] of cols) out.set(k, [...m.values()].sort((a, b) => a.minY - b.minY));
  return out;
}
