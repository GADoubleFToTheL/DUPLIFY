import { describe, expect, it } from 'vitest';
import { colorAdjective } from './colors';
import { solveColors } from './colorSolver';
import { boundsOf, footprintSize, occupiedCells, rotateLocal, studCells } from './grid';
import {
  canBuild,
  demandOf,
  missingParts,
  parseVariantKey,
  sampleCounts,
  shapeTotals,
  totalParts,
  variantKey,
  type Counts,
} from './inventory';
import { PARTS, getPart, setCustomParts } from './parts/catalog';
import { createRng } from './rng';
import { buildOrder, groupSteps, isBuildableOrder } from './steps';
import { splitPlacement, splitRole } from './substitute';
import type { ColorId, Placement, Rot } from './types';
import { isValid, validate } from './validate';

const P = (part: string, x: number, y: number, z: number, rot: Rot = 0, extra: Partial<Placement> = {}): Placement => ({
  part,
  x,
  y,
  z,
  rot,
  color: 'rot',
  ...extra,
});

describe('Katalog', () => {
  it('hat eindeutige IDs und sinnvolle Maße', () => {
    const ids = new Set(PARTS.map((p) => p.id));
    expect(ids.size).toBe(PARTS.length);
    for (const p of PARTS) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.l).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });

  it('kennt eigene Teile nach dem Anmelden', () => {
    setCustomParts([{ id: 'custom-krone', name: 'Krone', w: 2, l: 2, heightBricks: 1 }]);
    expect(getPart('custom-krone').group).toBe('eigene');
    setCustomParts([]);
    expect(() => getPart('custom-krone')).toThrow();
  });

  it('dekliniert Farben für die Sprachausgabe', () => {
    expect(colorAdjective('rot', 'm')).toBe('roten');
    expect(colorAdjective('rot', 'f')).toBe('rote');
    expect(colorAdjective('lila', 'm')).toBe('lila');
  });
});

describe('Raster', () => {
  it('Drehung bildet die Grundfläche lückenlos ab', () => {
    for (const def of PARTS) {
      for (const rot of [0, 1, 2, 3] as Rot[]) {
        const { w, l } = footprintSize(def, rot);
        const seen = new Set<string>();
        for (let lx = 0; lx < def.w; lx++) {
          for (let lz = 0; lz < def.l; lz++) {
            const [x, z] = rotateLocal(def, rot, lx, lz);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThan(w);
            expect(z).toBeGreaterThanOrEqual(0);
            expect(z).toBeLessThan(l);
            seen.add(`${x},${z}`);
          }
        }
        expect(seen.size).toBe(w * l);
      }
    }
  });

  it('Bogen hat unten eine Öffnung', () => {
    const cells = occupiedCells(P('arch-2x4', 0, 0, 0));
    expect(cells.length).toBe(4 * 2 * 4 - 2 * 2 * 2);
    expect(cells.some((c) => c.x === 1 && c.y === 0)).toBe(false);
    expect(cells.some((c) => c.x === 1 && c.y === 3)).toBe(true);
  });

  it('Dachstein hat nur hinten Noppen', () => {
    const studs = studCells(P('slope-2x2', 0, 0, 0));
    expect(studs.map((s) => s.z)).toEqual([0, 0]);
    const rotated = studCells(P('slope-2x2', 0, 0, 0, 2));
    expect(rotated.map((s) => s.z)).toEqual([1, 1]);
  });

  it('berechnet Grenzen', () => {
    const b = boundsOf([P('brick-2x4', 0, 0, 0), P('brick-2x2', 2, 2, 0, 1)]);
    expect(b).toMatchObject({ minX: 0, maxX: 4, minZ: 0, maxZ: 2, maxY: 4 });
  });
});

describe('Validierung', () => {
  it('akzeptiert gestapelte und versetzte Steine', () => {
    expect(isValid([P('brick-2x4', 0, 0, 0), P('brick-2x4', 0, 2, 0)])).toBe(true);
    expect(isValid([P('brick-2x4', 0, 0, 0), P('brick-2x4', 2, 2, 0), P('brick-2x4', 4, 0, 0)])).toBe(true);
    expect(isValid([P('brick-2x4', 0, 0, 0), P('brick-2x4', 1, 2, 0, 1)])).toBe(true);
  });

  it('erkennt Überlappung', () => {
    const issues = validate([P('brick-2x4', 0, 0, 0), P('brick-2x2', 2, 0, 0)]);
    expect(issues.some((i) => i.code === 'overlap')).toBe(true);
  });

  it('erkennt schwebende Teile (weniger als 2 Noppen)', () => {
    const one = validate([P('brick-2x2', 0, 0, 0), P('brick-2x2', 1, 2, 1)], { checkTipping: false });
    expect(one.some((i) => i.code === 'floating')).toBe(true);
    const air = validate([P('brick-2x2', 0, 2, 0)]);
    expect(air.some((i) => i.code === 'floating')).toBe(true);
  });

  it('Räder nur auf dem Boden', () => {
    expect(validate([P('brick-2x4', 0, 0, 0), P('car-2x6', 0, 2, 0)]).some((i) => i.code === 'groundOnly')).toBe(true);
    expect(isValid([P('car-2x6', 0, 0, 0), P('brick-2x4', 1, 2, 0)])).toBe(true);
  });

  it('auf der Schräge hält nur die hintere Reihe', () => {
    expect(isValid([P('slope-2x2', 0, 0, 0), P('brick-2x2', 0, 2, -1)])).toBe(true);
    expect(isValid([P('slope-2x2', 0, 0, 0), P('brick-2x2', 0, 2, 1)], { checkTipping: false })).toBe(false);
  });

  it('unter einem Bogen ist Platz, oben drauf hält es', () => {
    const arch = P('arch-2x4', 0, 0, 0);
    expect(isValid([arch, P('brick-2x2', 1, 0, 0)])).toBe(true);
    expect(isValid([arch, P('brick-2x4', 0, 4, 0)])).toBe(true);
    // Eine Figur ist zu hoch für die Öffnung.
    expect(validate([arch, P('figure', 1, 0, 0, 0, { color: null })]).some((i) => i.code === 'overlap')).toBe(true);
  });

  it('erkennt Kippen', () => {
    const tip = validate([P('brick-2x2', 0, 0, 0), P('brick-2x10', 0, 2, 0)]);
    expect(tip.some((i) => i.code === 'tipping')).toBe(true);
    expect(validate([P('brick-2x2', 0, 0, 0), P('brick-2x10', 0, 2, 0)], { baseplate: true })).toEqual([]);
    expect(isValid([P('brick-2x2', 4, 0, 0), P('brick-2x10', 0, 2, 0)])).toBe(true);
  });
});

describe('Bau-Reihenfolge', () => {
  it('baut ein Teilbauwerk nach dem anderen, jeweils von unten nach oben', () => {
    const ps = [P('brick-2x4', 0, 2, 0), P('brick-2x4', 0, 0, 2), P('brick-2x4', 0, 0, 0)];
    const order = buildOrder(ps);
    expect(order).toEqual([2, 0, 1]);
    expect(isBuildableOrder(ps, order)).toBe(true);
  });

  it('Stein unter dem Bogen kommt vor dem Bogen, Deko zuletzt', () => {
    const ps = [
      P('arch-2x4', 0, 0, 0),
      P('brick-2x2', 1, 0, 0),
      P('flower', 0, 4, 0),
      P('brick-2x4', 4, 0, 0),
    ];
    const order = buildOrder(ps);
    expect(order).toEqual([1, 0, 2, 3]);
    expect(isBuildableOrder(ps, order)).toBe(true);
  });

  it('Deko kommt innerhalb eines Bauwerks zuletzt', () => {
    const ps = [P('brick-2x4', 0, 0, 0), P('flower', 0, 2, 0), P('brick-2x2', 2, 2, 0), P('brick-2x2', 2, 4, 0)];
    expect(buildOrder(ps)).toEqual([0, 2, 3, 1]);
  });

  it('gruppiert Schichten', () => {
    const ps = [P('brick-2x4', 0, 0, 0), P('brick-2x4', 4, 0, 0), P('brick-2x4', 2, 2, 0)];
    const steps = groupSteps(ps, buildOrder(ps), 'layer');
    expect(steps.map((s) => s.length)).toEqual([2, 1]);
  });
});

describe('Bestand', () => {
  it('Schlüssel hin und zurück', () => {
    const k = variantKey('brick-2x4', 'gelb', 'eyes');
    expect(parseVariantKey(k)).toEqual({ part: 'brick-2x4', color: 'gelb', print: 'eyes' });
    expect(parseVariantKey(variantKey('figure', null))).toEqual({ part: 'figure', color: null, print: null });
  });

  it('Bedarf, Fehlteile, Bauformen', () => {
    const counts: Counts = { [variantKey('brick-2x4', 'rot')]: 1, [variantKey('brick-2x4', 'rot', 'picture')]: 2 };
    const ps = [P('brick-2x4', 0, 0, 0), P('brick-2x4', 0, 2, 0)];
    expect(demandOf(ps).get(variantKey('brick-2x4', 'rot'))).toBe(2);
    expect(canBuild(counts, ps)).toBe(false);
    expect(missingParts(counts, ps)[0]).toMatchObject({ need: 2, have: 1 });
    expect(shapeTotals(counts).get('brick-2x4')).toBe(3);
    expect(totalParts(counts)).toBe(3);
  });

  it('Beispiel-Kiste ist gut gefüllt', () => {
    expect(totalParts(sampleCounts())).toBeGreaterThan(120);
  });
});

describe('Farb-Löser', () => {
  const counts = (entries: [string, ColorId | null, number, ('eyes' | 'picture')?][]): Counts =>
    Object.fromEntries(entries.map(([p, c, n, pr]) => [variantKey(p, c, pr), n]));

  it('nimmt Lieblingsfarben, wenn genug da sind', () => {
    const ps = [P('brick-2x4', 0, 0, 0, 0, { role: 'body', color: null })];
    const res = solveColors(ps, [{ id: 'body', prefer: ['gelb'] }], counts([['brick-2x4', 'gelb', 1], ['brick-2x4', 'rot', 5]]));
    expect(res.ok && res.placements[0].color).toBe('gelb');
  });

  it('weicht aus, wenn die Lieblingsfarbe fehlt – oder scheitert ohne Tausch', () => {
    const ps = [P('brick-2x4', 0, 0, 0, 0, { role: 'body' }), P('brick-2x4', 0, 2, 0, 0, { role: 'body' })];
    const c = counts([['brick-2x4', 'gelb', 1], ['brick-2x4', 'blau', 2]]);
    const res = solveColors(ps, [{ id: 'body', prefer: ['gelb'] }], c);
    expect(res.ok && res.placements.map((p) => p.color)).toEqual(['blau', 'blau']);
    expect(solveColors(ps, [{ id: 'body', prefer: ['gelb'] }], c, { allowSwap: false }).ok).toBe(false);
  });

  it('unterscheidet Rollen, wenn möglich', () => {
    const ps = [P('brick-2x4', 0, 0, 0, 0, { role: 'wall' }), P('slope-2x2', 0, 2, 0, 0, { role: 'roof' })];
    const c = counts([['brick-2x4', 'rot', 2], ['slope-2x2', 'rot', 1], ['slope-2x2', 'blau', 1]]);
    const res = solveColors(ps, [{ id: 'wall', prefer: ['rot'] }, { id: 'roof', prefer: ['rot'], differentFrom: ['wall'] }], c);
    expect(res.ok && res.placements.map((p) => p.color)).toEqual(['rot', 'blau']);
  });

  it('bunte Rollen folgen der Wunschfolge und verbrauchen nicht mehr als da ist', () => {
    const ps = [0, 2, 4, 6].map((y) => P('brick-2x2', 0, y, 0, 0, { role: 'rainbow' }));
    const c = counts([['brick-2x2', 'rot', 1], ['brick-2x2', 'gelb', 2], ['brick-2x2', 'blau', 1]]);
    const res = solveColors(ps, [{ id: 'rainbow', mixed: true, sequence: ['rot', 'gelb', 'blau'] }], c);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.placements.map((p) => p.color)).toEqual(['rot', 'gelb', 'blau', 'gelb']);
      expect(canBuild(c, res.placements)).toBe(true);
    }
  });

  it('nutzt Bildsteine, wenn normale nicht reichen', () => {
    const ps = [P('brick-2x2', 0, 0, 0, 0, { role: 'a' }), P('brick-2x2', 0, 2, 0, 0, { role: 'a' })];
    const c = counts([['brick-2x2', 'weiss', 1], ['brick-2x2', 'weiss', 1, 'picture']]);
    const res = solveColors(ps, [{ id: 'a' }], c);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.placements.filter((p) => p.print === 'picture').length).toBe(1);
      expect(canBuild(c, res.placements)).toBe(true);
    }
  });

  it('Augensteine und Figuren werden geprüft', () => {
    const ps = [P('brick-2x4', 0, 0, 0, 0, { role: 'head', print: 'eyes' }), P('figure', 0, 2, 0, 0, { color: null })];
    expect(solveColors(ps, [{ id: 'head' }], counts([['brick-2x4', 'gelb', 1, 'eyes'], ['figure', null, 1]])).ok).toBe(true);
    expect(solveColors(ps, [{ id: 'head' }], counts([['brick-2x4', 'gelb', 1], ['figure', null, 1]])).ok).toBe(false);
  });

  it('ist deterministisch mit gleichem Seed', () => {
    const ps = [0, 2, 4].map((y) => P('brick-2x4', 0, y, 0, 0, { role: 'x' }));
    const c = sampleCounts();
    const a = solveColors(ps, [{ id: 'x', mixed: true }], c, { rng: createRng(5) });
    const b = solveColors(ps, [{ id: 'x', mixed: true }], c, { rng: createRng(5) });
    expect(a).toEqual(b);
  });
});

describe('Ersetzungen', () => {
  it('zerlegt 2x4 in zwei 2x2 – auch gedreht', () => {
    expect(splitPlacement(P('brick-2x4', 0, 0, 0))!.map((p) => [p.part, p.x, p.z])).toEqual([
      ['brick-2x2', 0, 0],
      ['brick-2x2', 2, 0],
    ]);
    expect(splitPlacement(P('brick-2x4', 0, 0, 0, 1))!.map((p) => [p.x, p.z])).toEqual([
      [0, 0],
      [0, 2],
    ]);
    expect(splitPlacement(P('tall-2x4', 0, 0, 0))!.map((p) => [p.part, p.y])).toEqual([
      ['brick-2x4', 0],
      ['brick-2x4', 2],
    ]);
  });

  it('bleibt gültig nach dem Zerlegen', () => {
    const ps = [P('brick-2x6', 0, 0, 0, 0, { role: 'w' }), P('brick-2x4', 1, 2, 0, 0, { role: 'w' })];
    expect(isValid(ps)).toBe(true);
    expect(isValid(splitRole(ps, 'w'))).toBe(true);
  });
});
