import { describe, expect, it } from 'vitest';
import { getPart, partNumber } from './catalog';
import { catalogVariants, normalizeSearch, searchVariants } from './search';

const ALL = catalogVariants();
const ids = (q: string) => searchVariants(ALL, q).map((v) => `${v.def.id}${v.print ? `:${v.print}` : ''}`);

describe('Katalog-Suche der Steine-Kiste', () => {
  it('normalisiert Umlaute, Maße und Satzzeichen', () => {
    expect(normalizeSearch('Tür 2 x 4')).toBe('tuer 2x4');
    expect(normalizeSearch('Stein 2×4×2, Größe')).toBe('stein 2x4x2 groesse');
    expect(normalizeSearch('  ')).toBe('');
  });

  it('findet Teile über die Teilenummer', () => {
    expect(ids('3011')[0]).toBe('brick-2x4');
    expect(ids('6474')).toContain('slope-2x2');
    // zusammengesetzte Teile über die Nummern ihrer Einzelteile
    expect(ids('18816')).toContain('door');
    expect(partNumber(getPart('door'))).toBe('4253c01 + 18816');
  });

  it('findet deutsch und englisch', () => {
    expect(ids('tür')).toContain('door');
    expect(ids('door')).toContain('door');
    expect(ids('2x4')).toEqual(expect.arrayContaining(['brick-2x4', 'ld-40666']));
    expect(ids('grundplatte 24')).toContain('ld-4268');
  });

  it('zeigt Treffer am Wortanfang zuerst („Bogen“ vor „gebogen“)', () => {
    const hits = searchVariants(ALL, 'bogen');
    expect(hits.length).toBeGreaterThan(5);
    const firstWeak = hits.findIndex((v) => !/(^| )bogen/.test(v.search));
    const lastStrong = hits.map((v) => /(^| )bogen/.test(v.search)).lastIndexOf(true);
    expect(firstWeak === -1 || lastStrong < firstWeak).toBe(true);
    expect(hits[0].def.kind).toBe('arch');
  });

  it('häufige Teile stehen vorne, Teile mit Aufdruck hinten', () => {
    const firstRare = ALL.findIndex((v) => !v.def.common);
    expect(ALL.slice(0, firstRare).every((v) => v.def.common)).toBe(true);
    for (const id of ['brick-2x4', 'ld-40666', 'ld-4268', 'figure']) expect(ALL.slice(0, firstRare).some((v) => v.def.id === id)).toBe(true);
    const rare = ALL.slice(firstRare);
    const firstPrinted = rare.findIndex((v) => v.def.printed);
    expect(rare.slice(firstPrinted).every((v) => v.def.printed)).toBe(true);
  });

  it('Originalteile mit Aufdruck zeigen ihre Vorderseite zur Kamera', () => {
    // In LDraw zeigt der Aufdruck nach −z, in der App nach +z → Grund-Drehung 180°.
    expect(getPart('ld-3011pt6').ldraw).toEqual({ file: '3011pt6', rot: 2 });
  });
});
