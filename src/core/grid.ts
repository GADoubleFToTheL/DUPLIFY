import { getPart, type Cell2, type PartDef } from './parts/catalog';
import type { Placement, Rot } from './types';

export interface Cell {
  x: number;
  y: number;
  z: number;
}

export interface Column {
  x: number;
  z: number;
}

export const cellKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
export const columnKey = (x: number, z: number): string => `${x},${z}`;

/** Größe der Grundfläche nach Drehung. */
export function footprintSize(def: PartDef, rot: Rot): { w: number; l: number } {
  return rot % 2 === 0 ? { w: def.w, l: def.l } : { w: def.l, l: def.w };
}

/** Lokale Noppe → Versatz zur Platzierungsecke in Weltkoordinaten. */
export function rotateLocal(def: PartDef, rot: Rot, lx: number, lz: number): [number, number] {
  switch (rot) {
    case 0:
      return [lx, lz];
    case 1:
      return [def.l - 1 - lz, lx];
    case 2:
      return [def.w - 1 - lx, def.l - 1 - lz];
    case 3:
      return [lz, def.w - 1 - lx];
  }
}

const holeCache = new Map<string, Set<string>>();
function holesOf(def: PartDef): Set<string> {
  let set = holeCache.get(def.id);
  if (!set) {
    set = new Set((def.holes ?? []).map(([lx, ly, lz]) => cellKey(lx, ly, lz)));
    holeCache.set(def.id, set);
  }
  return set;
}

function allCells2(def: PartDef): Cell2[] {
  const out: Cell2[] = [];
  for (let lx = 0; lx < def.w; lx++) for (let lz = 0; lz < def.l; lz++) out.push([lx, lz]);
  return out;
}

/** Alle belegten Zellen eines Teils (Welt, y in Halb-Ebenen). */
export function occupiedCells(p: Placement): Cell[] {
  const def = getPart(p.part);
  const holes = holesOf(def);
  const out: Cell[] = [];
  for (let lx = 0; lx < def.w; lx++) {
    for (let lz = 0; lz < def.l; lz++) {
      const [ox, oz] = rotateLocal(def, p.rot, lx, lz);
      for (let ly = 0; ly < def.h; ly++) {
        if (holes.size && holes.has(cellKey(lx, ly, lz))) continue;
        out.push({ x: p.x + ox, y: p.y + ly, z: p.z + oz });
      }
    }
  }
  return out;
}

/** Noppen oben (Welt). `y` ist die Höhe der Oberkante. */
export function studCells(p: Placement): Cell[] {
  const def = getPart(p.part);
  if (def.studs === 'none') return [];
  const cells = def.studs === undefined || def.studs === 'all' ? allCells2(def) : def.studs;
  const top = p.y + def.h;
  return cells.map(([lx, lz]) => {
    const [ox, oz] = rotateLocal(def, p.rot, lx, lz);
    return { x: p.x + ox, y: top, z: p.z + oz };
  });
}

/** Auflageflächen unten (Welt). */
export function bottomCells(p: Placement): Column[] {
  const def = getPart(p.part);
  const cells = def.bottom === undefined || def.bottom === 'all' ? allCells2(def) : def.bottom;
  return cells.map(([lx, lz]) => {
    const [ox, oz] = rotateLocal(def, p.rot, lx, lz);
    return { x: p.x + ox, z: p.z + oz };
  });
}

/** Alle Noppen-Felder der Grundfläche (Welt). */
export function footprintCells(p: Placement): Column[] {
  const def = getPart(p.part);
  const { w, l } = footprintSize(def, p.rot);
  const out: Column[] = [];
  for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < l; dz++) out.push({ x: p.x + dx, z: p.z + dz });
  return out;
}

export interface Bounds {
  minX: number;
  maxX: number; // exklusiv
  minZ: number;
  maxZ: number; // exklusiv
  minY: number;
  maxY: number; // exklusiv, Halb-Ebenen
}

export function boundsOf(placements: readonly Placement[]): Bounds {
  if (placements.length === 0) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, minY: 0, maxY: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of placements) {
    const def = getPart(p.part);
    const { w, l } = footprintSize(def, p.rot);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + w);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z + l);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + def.h);
  }
  return { minX, maxX, minZ, maxZ, minY, maxY };
}

/** Verschiebt ein Bauwerk so, dass die Grundfläche um den Ursprung zentriert ist. */
export function centerPlacements(placements: readonly Placement[]): Placement[] {
  const b = boundsOf(placements);
  const dx = -Math.floor((b.minX + b.maxX) / 2);
  const dz = -Math.floor((b.minZ + b.maxZ) / 2);
  return placements.map((p) => ({ ...p, x: p.x + dx, z: p.z + dz }));
}
