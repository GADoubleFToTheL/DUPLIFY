import { describe, expect, it } from 'vitest';
import { LDRAW_PARTS, PARTS, allParts, getPart } from './catalog';

describe('Originalteile (LDraw)', () => {
  it('Standardteile haben die echten Maße', () => {
    expect(getPart('brick-2x4')).toMatchObject({ w: 4, l: 2, h: 2, studs: 'all', ldraw: { file: '3011' } });
    expect(getPart('brick-2x2')).toMatchObject({ w: 2, l: 2, h: 2 });
    expect(getPart('tall-2x2')).toMatchObject({ w: 2, l: 2, h: 4 });
    // Dachstein: 1½ Steine hoch, Noppen nur hinten (lz = 0)
    const slope = getPart('slope-2x2');
    expect(slope).toMatchObject({ w: 2, l: 2, h: 3 });
    expect(Array.isArray(slope.studs) && slope.studs.map((c) => c.join(',')).sort()).toEqual(['0,0', '1,0']);
    // Rundstein 2x3: lang entlang x, Noppen hinten, Rundung vorne (+x)
    const curved = getPart('curved-2x3');
    expect(curved).toMatchObject({ w: 3, l: 2, h: 2 });
    expect(Array.isArray(curved.studs) && curved.studs.every(([lx]) => lx <= 1)).toBe(true);
    // Auto-Basis: 2x6, 1½ hoch, nur auf dem Boden
    expect(getPart('car-2x6')).toMatchObject({ w: 6, l: 2, h: 3, groundOnly: true });
    // Tür- und Fensterrahmen 2x4x3
    expect(getPart('door')).toMatchObject({ w: 4, l: 2, h: 6 });
    expect(getPart('window')).toMatchObject({ w: 4, l: 2, h: 6 });
    expect(getPart('arch-2x4')).toMatchObject({ w: 4, l: 2, h: 4 });
  });

  it('Figuren, Tiere und Wippe sind gezeichnet', () => {
    for (const id of ['figure', 'animal', 'seesaw', 'flower']) expect(getPart(id).drawn).toBe(true);
  });

  it('der komplette Katalog ist da und jedes Teil hat gültige Maße', () => {
    expect(LDRAW_PARTS.length).toBeGreaterThan(500);
    const ids = new Set(allParts().map((p) => p.id));
    expect(ids.size).toBe(PARTS.length + LDRAW_PARTS.length);
    for (const p of allParts()) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.l).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
      if (Array.isArray(p.studs)) {
        for (const [lx, lz] of p.studs) {
          expect(lx).toBeGreaterThanOrEqual(0);
          expect(lx).toBeLessThan(p.w);
          expect(lz).toBeGreaterThanOrEqual(0);
          expect(lz).toBeLessThan(p.l);
        }
      }
    }
  });

  it('deutsche Namen ohne „Duplo“-Vorsilbe', () => {
    expect(getPart('ld-31213b').name).toMatch(/^Stein 2 x 4 x 2/);
    expect(LDRAW_PARTS.every((p) => !p.name.startsWith('Duplo'))).toBe(true);
  });
});
