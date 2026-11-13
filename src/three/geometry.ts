import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Cell2, PartDef } from '../core/parts/catalog';
import { HALF, SEAM, STUD_HEIGHT, STUD_RADIUS } from '../core/units';

/**
 * Prozedurale Geometrie aller Teile. Lokaler Ursprung: Mitte der Grundfläche, Unterkante.
 * x: -w/2 … w/2, z: -l/2 … l/2, y: 0 … h·HALF. Vorderseite zeigt nach +z.
 */
const cache = new Map<string, THREE.BufferGeometry>();

export function cachedGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    cache.set(key, g);
  }
  return g;
}

function prep(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.getAttribute('uv')) {
    const count = ng.getAttribute('position').count;
    ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  for (const name of Object.keys(ng.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) ng.deleteAttribute(name);
  }
  return ng;
}

export function merge(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geoms.map(prep), false);
  if (!merged) throw new Error('Geometrien ließen sich nicht zusammenfügen');
  return merged;
}

export const heightOf = (def: PartDef) => def.h * HALF;
export const cellCenter = (def: PartDef, lx: number, lz: number): [number, number] => [
  lx + 0.5 - def.w / 2,
  lz + 0.5 - def.l / 2,
];

/** Hohle Noppe (wie bei echten großen Bausteinen), Unterkante bei y = 0. */
export function studGeometry(): THREE.BufferGeometry {
  return cachedGeometry('stud', () => {
    const r = STUD_RADIUS;
    const h = STUD_HEIGHT;
    const rin = r * 0.64;
    const depth = h * 0.55;
    const bevel = 0.035;
    const pts = [
      new THREE.Vector2(r, 0),
      new THREE.Vector2(r, h - bevel),
      new THREE.Vector2(r - bevel * 0.4, h - bevel * 0.25),
      new THREE.Vector2(r - bevel, h),
      new THREE.Vector2(rin + 0.02, h),
      new THREE.Vector2(rin, h - 0.02),
      new THREE.Vector2(rin, h - depth),
      new THREE.Vector2(0.0001, h - depth),
    ];
    return new THREE.LatheGeometry(pts, 28);
  });
}

function studsAt(def: PartDef, cells: readonly Cell2[], top: number): THREE.BufferGeometry[] {
  return cells.map(([lx, lz]) => {
    const [x, z] = cellCenter(def, lx, lz);
    return studGeometry().clone().translate(x, top - 0.002, z);
  });
}

function allCells(def: PartDef): Cell2[] {
  const out: Cell2[] = [];
  for (let lx = 0; lx < def.w; lx++) for (let lz = 0; lz < def.l; lz++) out.push([lx, lz]);
  return out;
}

function studCellsOf(def: PartDef): readonly Cell2[] {
  if (def.studs === 'none') return [];
  if (def.studs === undefined || def.studs === 'all') return allCells(def);
  return def.studs;
}

function roundedBox(w: number, h: number, d: number, r = 0.06): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
}

/** Extrudiert eine Kontur aus der x/y-Ebene entlang z (zentriert). */
function extrudeXY(shape: THREE.Shape, depth: number, bevel = 0.025): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 20,
  });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  return g;
}

/** Extrudiert eine Kontur aus der z/y-Ebene (Kontur-x = Welt-z) entlang x (zentriert). */
function extrudeZY(shape: THREE.Shape, depth: number, bevel = 0.025): THREE.BufferGeometry {
  const g = extrudeXY(shape, depth, bevel);
  g.rotateY(-Math.PI / 2);
  return g;
}

// ---------- Teile ----------

export function brickGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const H = heightOf(def);
    const body = roundedBox(def.w - 2 * SEAM, H - SEAM, def.l - 2 * SEAM, 0.07).translate(0, (H - SEAM) / 2, 0);
    return merge([body, ...studsAt(def, studCellsOf(def), H)]);
  });
}

export function slopeGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const H = heightOf(def) - SEAM;
    const b = 0.025;
    const half = def.l / 2 - SEAM - b;
    const low = def.h > 2 ? 0.28 : 0.2;
    const s = new THREE.Shape();
    s.moveTo(-half, b);
    s.lineTo(half, b);
    s.lineTo(half, low);
    s.lineTo(-def.l / 2 + 1, H - b);
    s.lineTo(-half, H - b);
    s.closePath();
    const body = extrudeZY(s, def.w - 2 * SEAM, b);
    return merge([body, ...studsAt(def, studCellsOf(def), heightOf(def))]);
  });
}

export function curvedGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const H = heightOf(def) - SEAM;
    const b = 0.03;
    const half = def.w / 2 - SEAM - b;
    const shoulder = H * 0.42;
    const s = new THREE.Shape();
    s.moveTo(-half, b);
    s.lineTo(half, b);
    s.lineTo(half, shoulder);
    s.absellipse(0, shoulder, half, H - b - shoulder, 0, Math.PI, false, 0);
    s.lineTo(-half, b);
    return extrudeXY(s, def.l - 2 * SEAM, b);
  });
}

/** Rahmen für Tür und Fenster (1x4x3). */
export const FRAME_OPENING = { halfW: 1.35, bottom: 0.22, topGap: 0.62 };

export function frameGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const H = heightOf(def) - SEAM;
    const b = 0.025;
    const half = def.w / 2 - SEAM - b;
    const s = new THREE.Shape();
    s.moveTo(-half, b);
    s.lineTo(half, b);
    s.lineTo(half, H - b);
    s.lineTo(-half, H - b);
    s.closePath();
    const hole = new THREE.Path();
    const { halfW, bottom, topGap } = FRAME_OPENING;
    hole.moveTo(-halfW, bottom);
    hole.lineTo(-halfW, H - topGap);
    hole.lineTo(halfW, H - topGap);
    hole.lineTo(halfW, bottom);
    hole.closePath();
    s.holes.push(hole);
    const body = extrudeXY(s, def.l - 2 * SEAM, b);
    return merge([body, ...studsAt(def, studCellsOf(def), heightOf(def))]);
  });
}

export function archGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const H = heightOf(def) - SEAM;
    const b = 0.025;
    const half = def.w / 2 - SEAM - b;
    const open = def.w / 2 - 1 + 0.02;
    const shoulder = 1.2;
    const ry = def.w > 4 ? 0.72 : 0.6;
    const s = new THREE.Shape();
    s.moveTo(-half, b);
    s.lineTo(-open, b);
    s.lineTo(-open, shoulder);
    s.absellipse(0, shoulder, open, ry, Math.PI, 0, true, 0);
    s.lineTo(open, b);
    s.lineTo(half, b);
    s.lineTo(half, H - b);
    s.lineTo(-half, H - b);
    s.closePath();
    const body = extrudeXY(s, def.l - 2 * SEAM, b);
    return merge([body, ...studsAt(def, studCellsOf(def), heightOf(def))]);
  });
}

export const VEHICLE = {
  car: { wheelR: 0.42, wheelW: 0.34, baseBottom: 0.56, inset: 1.15 },
  wagon: { wheelR: 0.34, wheelW: 0.3, baseBottom: 0.46, inset: 1.0 },
};

export function vehicleGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`body:${def.id}`, () => {
    const v = def.id.startsWith('car') ? VEHICLE.car : VEHICLE.wagon;
    const H = heightOf(def);
    const baseH = H - v.baseBottom - SEAM;
    const base = roundedBox(def.w - 2 * SEAM, baseH, def.l - 2 * SEAM - 0.1, 0.12).translate(
      0,
      v.baseBottom + baseH / 2,
      0,
    );
    const parts = [base, ...studsAt(def, studCellsOf(def), H)];
    if (def.id.startsWith('car')) {
      // Stoßstangen
      parts.push(roundedBox(0.3, 0.32, def.l - 0.4, 0.1).translate(def.w / 2 - 0.05, v.baseBottom + 0.1, 0));
      parts.push(roundedBox(0.3, 0.32, def.l - 0.4, 0.1).translate(-def.w / 2 + 0.05, v.baseBottom + 0.1, 0));
    }
    return merge(parts);
  });
}

export function wheelGeometry(r: number, w: number): THREE.BufferGeometry {
  return cachedGeometry(`wheel:${r}:${w}`, () => {
    const t = new THREE.CylinderGeometry(r, r, w, 28);
    t.rotateX(Math.PI / 2);
    return t;
  });
}

export function hubGeometry(r: number, w: number): THREE.BufferGeometry {
  return cachedGeometry(`hub:${r}:${w}`, () => {
    const t = new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 20);
    t.rotateX(Math.PI / 2);
    return t;
  });
}

export function seesawBaseGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`seesaw-base:${def.id}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-0.9, 0);
    s.lineTo(0.9, 0);
    s.lineTo(0.35, 1.45);
    s.lineTo(-0.35, 1.45);
    s.closePath();
    return extrudeXY(s, def.l - 1.2, 0.04);
  });
}

export function seesawPlankGeometry(def: PartDef): THREE.BufferGeometry {
  return cachedGeometry(`seesaw-plank:${def.id}`, () => {
    const H = heightOf(def);
    const plank = roundedBox(def.w - 2 * SEAM, 0.32, def.l - 0.5, 0.1).translate(0, H - 0.16 - SEAM, 0);
    const studs = studsAt(def, studCellsOf(def), H);
    const handles: THREE.BufferGeometry[] = [];
    for (const sx of [-2.6, 2.6]) {
      for (const sz of [-0.9, 0.9]) {
        handles.push(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12).translate(sx, H + 0.33, sz));
      }
      handles.push(new THREE.CylinderGeometry(0.08, 0.08, 1.9, 12).rotateX(Math.PI / 2).translate(sx, H + 0.68, 0));
    }
    return merge([plank, ...studs, ...handles]);
  });
}

/** Stern-Aufdruck für Bildsteine. */
export function starGeometry(r: number): THREE.BufferGeometry {
  return cachedGeometry(`star:${r}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s);
  });
}

export function heartGeometry(r: number): THREE.BufferGeometry {
  return cachedGeometry(`heart:${r}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, -r * 0.9);
    s.bezierCurveTo(r * 1.2, -r * 0.1, r * 0.9, r * 0.95, 0, r * 0.45);
    s.bezierCurveTo(-r * 0.9, r * 0.95, -r * 1.2, -r * 0.1, 0, -r * 0.9);
    return new THREE.ShapeGeometry(s, 16);
  });
}

export function circleGeometry(r: number, seg = 24): THREE.BufferGeometry {
  return cachedGeometry(`circle:${r}:${seg}`, () => new THREE.CircleGeometry(r, seg));
}

export function sphereGeometry(r: number, w = 20, h = 14): THREE.BufferGeometry {
  return cachedGeometry(`sphere:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
}

export function boxGeometry(w: number, h: number, d: number, r = 0.05): THREE.BufferGeometry {
  return cachedGeometry(`rbox:${w}:${h}:${d}:${r}`, () => roundedBox(w, h, d, r));
}

export function cylinderGeometry(rt: number, rb: number, h: number, seg = 16): THREE.BufferGeometry {
  return cachedGeometry(`cyl:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

export function capsuleGeometry(r: number, len: number): THREE.BufferGeometry {
  return cachedGeometry(`capsule:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 16));
}

export function coneGeometry(r: number, h: number): THREE.BufferGeometry {
  return cachedGeometry(`cone:${r}:${h}`, () => new THREE.ConeGeometry(r, h, 16));
}

export function smileGeometry(r: number, tube: number): THREE.BufferGeometry {
  return cachedGeometry(`smile:${r}:${tube}`, () => {
    const t = new THREE.TorusGeometry(r, tube, 8, 20, Math.PI);
    t.rotateZ(Math.PI);
    return t;
  });
}

/** Grundplatte mit Noppen als eine Geometrie (Platte) – Noppen kommen per Instancing. */
export function baseplateGeometry(w: number, l: number): THREE.BufferGeometry {
  return cachedGeometry(`baseplate:${w}:${l}`, () => roundedBox(w - 0.04, 0.24, l - 0.04, 0.08).translate(0, -0.12, 0));
}
