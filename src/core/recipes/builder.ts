import { bottomCells, cellKey, columnKey, footprintSize, occupiedCells, studCells } from '../grid';
import { parseVariantKey, shapeKey, type Counts } from '../inventory';
import { getPart, hasPart } from '../parts/catalog';
import type { ColorId, PartId, Placement, Print, Rot } from '../types';

/** Verfügbare Bauformen (über alle Farben) – wird beim Bauen verbraucht. */
export class ShapeBudget {
  private readonly left = new Map<string, number>();

  constructor(totals: ReadonlyMap<string, number>) {
    for (const [k, v] of totals) this.left.set(k, v);
  }

  static fromCounts(counts: Counts): ShapeBudget {
    const m = new Map<string, number>();
    for (const [k, v] of Object.entries(counts)) {
      if (!(v > 0)) continue;
      const { part, print } = parseVariantKey(k);
      if (!hasPart(part)) continue;
      const s = shapeKey(part, print);
      m.set(s, (m.get(s) ?? 0) + v);
    }
    return new ShapeBudget(m);
  }

  count(part: PartId, print?: Print | null): number {
    return this.left.get(shapeKey(part, print)) ?? 0;
  }

  has(part: PartId, print?: Print | null, n = 1): boolean {
    return this.count(part, print) >= n;
  }

  take(part: PartId, print?: Print | null, n = 1): void {
    const k = shapeKey(part, print);
    this.left.set(k, (this.left.get(k) ?? 0) - n);
  }

  clone(): ShapeBudget {
    return new ShapeBudget(this.left);
  }

  /** Vorhandene eigene Teile (IDs). */
  customParts(): PartId[] {
    return [...this.left.entries()].filter(([k, n]) => k.startsWith('custom-') && n > 0).map(([k]) => k);
  }

  /** Vorhandene weitere Originalteile aus dem Katalog (`ld-…`). */
  catalogParts(): PartId[] {
    return [...this.left.entries()].filter(([k, n]) => k.startsWith('ld-') && n > 0 && hasPart(k)).map(([k]) => k);
  }
}

/** Originalteil, das sich wie ein Stein stapeln lässt (Noppen oben überall, nicht zu groß). */
export function isStackable(part: PartId): boolean {
  if (!hasPart(part)) return false;
  const d = getPart(part);
  return (d.kind === 'brick' || d.kind === 'plate') && d.studs === 'all' && !d.groundOnly && d.w * d.l <= 16 && d.h <= 6 && d.w >= 2;
}

/** Originalteil, das gut obendrauf passt (ohne Noppen oben, kleine Grundfläche). */
export function isTopper(part: PartId): boolean {
  if (!hasPart(part)) return false;
  const d = getPart(part);
  return !d.groundOnly && d.w * d.l <= 16 && (d.studs === 'none' || d.kind === 'deco');
}

/** Stein-Längen für 2 Noppen breite Streifen (Teil-ID je Länge). */
export const STRIP_PARTS: Record<number, PartId> = {
  2: 'brick-2x2',
  3: 'brick-2x3',
  4: 'brick-2x4',
  6: 'brick-2x6',
  8: 'brick-2x8',
  10: 'brick-2x10',
};

export interface StripOptions {
  /** Bevorzugte Reihenfolge der Längen (Standard: lang → kurz). */
  prefer?: number[];
  /** Von hinten auffüllen (versetzt die Fugen für einen Läuferverband). */
  reverse?: boolean;
}

/**
 * Mini-Baukasten für Baupläne: setzt Teile, prüft Platz und Vorrat.
 * Farben vergibt später der Farb-Löser anhand der Rollen.
 */
export class Builder {
  readonly placements: Placement[] = [];
  private readonly occ = new Set<string>();

  constructor(readonly budget: ShapeBudget) {}

  get size(): number {
    return this.placements.length;
  }

  has(part: PartId, print?: Print | null, n = 1): boolean {
    return hasPart(part) && this.budget.has(part, print, n);
  }

  fits(part: PartId, x: number, y: number, z: number, rot: Rot): boolean {
    const probe: Placement = { part, x, y, z, rot, color: null };
    return occupiedCells(probe).every((c) => !this.occ.has(cellKey(c.x, c.y, c.z)));
  }

  /** Setzt ein Teil, wenn Platz und Vorrat da sind. */
  place(part: PartId, x: number, y: number, z: number, rot: Rot, role: string, print?: Print): boolean {
    if (!this.has(part, print)) return false;
    if (!this.fits(part, x, y, z, rot)) return false;
    const p: Placement = { part, x, y, z, rot, color: null, role };
    if (print) p.print = print;
    for (const c of occupiedCells(p)) this.occ.add(cellKey(c.x, c.y, c.z));
    this.budget.take(part, print);
    this.placements.push(p);
    return true;
  }

  /** Wie `place`, aber mit vorgegebener Farbe (z. B. für Figuren ohne Farbwahl). */
  placeColored(part: PartId, x: number, y: number, z: number, rot: Rot, color: ColorId | null, role = 'fix'): boolean {
    const ok = this.place(part, x, y, z, rot, role);
    if (ok) this.placements[this.placements.length - 1].color = color;
    return ok;
  }

  /** Zerlegt eine Länge in verfügbare Steinlängen (ohne zu verbrauchen). */
  planStrip(length: number, opts: StripOptions = {}): number[] | null {
    const prefer = (opts.prefer ?? [10, 8, 6, 4, 3, 2]).filter((l) => l <= length);
    const used = new Map<number, number>();
    const avail = (l: number) => this.budget.count(STRIP_PARTS[l]) - (used.get(l) ?? 0);
    const solve = (rest: number): number[] | null => {
      if (rest === 0) return [];
      for (const l of prefer) {
        if (l > rest || avail(l) <= 0) continue;
        if (rest - l === 1) continue;
        used.set(l, (used.get(l) ?? 0) + 1);
        const tail = solve(rest - l);
        if (tail) return [l, ...tail];
        used.set(l, used.get(l)! - 1);
      }
      return null;
    };
    const seg = solve(length);
    if (!seg) return null;
    return opts.reverse ? seg.reverse() : seg;
  }

  /**
   * Füllt einen 2 Noppen breiten Streifen (entlang x oder z) mit Steinen.
   * Gibt false zurück (und setzt nichts), wenn es nicht passt.
   */
  strip(x: number, y: number, z: number, length: number, axis: 'x' | 'z', role: string, opts: StripOptions = {}): boolean {
    const seg = this.planStrip(length, opts);
    if (!seg) return false;
    let off = 0;
    const planned: [PartId, number, number, Rot][] = [];
    for (const l of seg) {
      const part = STRIP_PARTS[l];
      if (axis === 'x') planned.push([part, x + off, z, 0]);
      else planned.push([part, x, z + off, 1]);
      off += l;
    }
    if (!planned.every(([part, px, pz, rot]) => this.fits(part, px, y, pz, rot))) return false;
    for (const [part, px, pz, rot] of planned) this.place(part, px, y, pz, rot, role);
    return true;
  }

  /** Höchste belegte Halb-Ebene + 1. */
  get top(): number {
    let t = 0;
    for (const p of this.placements) t = Math.max(t, p.y + getPart(p.part).h);
    return t;
  }

  /** Noppen, die auf Höhe `y` (Halb-Ebenen) frei nach oben zeigen. */
  studsAt(y: number): Set<string> {
    const out = new Set<string>();
    for (const p of this.placements) {
      for (const s of studCells(p)) if (s.y === y && !this.occ.has(cellKey(s.x, y, s.z))) out.add(columnKey(s.x, s.z));
    }
    return out;
  }

  /**
   * Setzt ein Teil auf freie Noppen in Höhe `y` (Standard: ganz oben), möglichst nah an `near`.
   * Alle Auflageflächen müssen auf Noppen stehen.
   */
  placeOn(
    part: PartId,
    role: string,
    opts: { y?: number; near?: [number, number]; rot?: Rot; print?: Print; color?: ColorId | null } = {},
  ): boolean {
    if (!this.has(part, opts.print)) return false;
    const y = opts.y ?? this.top;
    const studs = this.studsAt(y);
    if (studs.size === 0) return false;
    const def = getPart(part);
    const rots: Rot[] = opts.rot !== undefined ? [opts.rot] : [0, 1];
    const [nx, nz] = opts.near ?? centerOf(studs);
    let best: { x: number; z: number; rot: Rot; d: number } | null = null;
    for (const key of studs) {
      const [sx, sz] = key.split(',').map(Number);
      for (const rot of rots) {
        const { w, l } = footprintSize(def, rot);
        for (let dx = 0; dx < w; dx++) {
          for (let dz = 0; dz < l; dz++) {
            const x = sx - dx;
            const z = sz - dz;
            const probe: Placement = { part, x, y, z, rot, color: null };
            if (!bottomCells(probe).every((c) => studs.has(columnKey(c.x, c.z)))) continue;
            if (!this.fits(part, x, y, z, rot)) continue;
            const d = Math.hypot(x + w / 2 - nx, z + l / 2 - nz);
            if (!best || d < best.d - 1e-6) best = { x, z, rot, d };
          }
        }
      }
    }
    if (!best) return false;
    if (opts.color !== undefined) return this.placeColored(part, best.x, y, best.z, best.rot, opts.color, role);
    return this.place(part, best.x, y, best.z, best.rot, role, opts.print);
  }

  /** Entfernt die zuletzt gesetzten Teile (z. B. wenn ein Schritt nicht aufgeht). */
  rollback(toSize: number): void {
    while (this.placements.length > toSize) {
      const p = this.placements.pop()!;
      for (const c of occupiedCells(p)) this.occ.delete(cellKey(c.x, c.y, c.z));
      this.budget.take(p.part, p.print, -1);
    }
  }
}

/** Häufigste Farben einer Bauform im Bestand (für schöne Farbfolgen). */
export function topColors(counts: Counts, parts: PartId[], k = 4): ColorId[] {
  const sum = new Map<ColorId, number>();
  for (const [key, v] of Object.entries(counts)) {
    if (!(v > 0)) continue;
    const { part, color, print } = parseVariantKey(key);
    if (!color || print === 'eyes' || !parts.includes(part)) continue;
    sum.set(color, (sum.get(color) ?? 0) + v);
  }
  return [...sum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([c]) => c);
}

function centerOf(cols: Set<string>): [number, number] {
  let sx = 0;
  let sz = 0;
  for (const k of cols) {
    const [x, z] = k.split(',').map(Number);
    sx += x + 0.5;
    sz += z + 0.5;
  }
  return [sx / cols.size, sz / cols.size];
}

/** Setzt eine Deko (Figur, Blume, Tier oder eigenes Teil) oben auf das Bauwerk. */
export function placeTopper(
  b: Builder,
  rng: { shuffle<T>(items: readonly T[]): T[] },
  opts: { near?: [number, number]; y?: number; options?: PartId[] } = {},
): PartId | null {
  const own = [...b.budget.customParts(), ...b.budget.catalogParts().filter(isTopper)];
  const options = rng.shuffle([...(opts.options ?? ['figure', 'flower', 'animal']), ...own]);
  for (const part of options) {
    if (!b.has(part)) continue;
    const def = getPart(part);
    const color = def.colorable ? undefined : null;
    if (b.placeOn(part, 'deko', { near: opts.near, y: opts.y, color })) return part;
  }
  return null;
}
