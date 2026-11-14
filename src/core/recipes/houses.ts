import type { RoleDef } from '../types';
import { Builder, placeTopper, topColors } from './builder';
import type { Recipe, RecipeContext } from './types';

const WALL_PARTS = ['brick-2x2', 'brick-2x4', 'brick-2x6', 'brick-2x8'];

function wallRole(ctx: RecipeContext, preferDefault: string[]): RoleDef {
  const r = ctx.rng.next();
  if (r < 0.35) return { id: 'wand', mixed: true };
  const top = topColors(ctx.counts, WALL_PARTS, 4);
  const prefer = ctx.rng.shuffle(preferDefault).filter((c) => top.includes(c as never));
  return { id: 'wand', prefer: [...prefer, ...top] as RoleDef['prefer'] };
}

const ROOF_ROLE: RoleDef = { id: 'dach', prefer: ['rot', 'blau', 'orange', 'braun', 'gruen'], differentFrom: ['wand'] };

/**
 * Eine Wand-Ebene eines Hauses mit 8x6 Grundfläche (2 Noppen dicke Wände, innen hohl).
 * `openFront`: vorne in der Mitte bleibt Platz für Tür/Fenster.
 */
function houseLayer(b: Builder, li: number, y: number, openFront: boolean): boolean {
  const role = 'wand';
  const start = b.size;
  const rev = li % 4 >= 2;
  let ok: boolean;
  if (li % 2 === 0) {
    ok =
      b.strip(0, y, 0, 8, 'x', role, { reverse: rev }) &&
      b.place('brick-2x2', 0, y, 2, 0, role) &&
      b.place('brick-2x2', 6, y, 2, 0, role) &&
      (openFront
        ? b.place('brick-2x2', 0, y, 4, 0, role) && b.place('brick-2x2', 6, y, 4, 0, role)
        : b.strip(0, y, 4, 8, 'x', role, { reverse: !rev }));
  } else {
    ok =
      b.strip(0, y, 0, 6, 'z', role, { reverse: rev }) &&
      b.strip(6, y, 0, 6, 'z', role, { reverse: !rev }) &&
      b.strip(2, y, 0, 4, 'x', role) &&
      (openFront || b.strip(2, y, 4, 4, 'x', role));
  }
  if (!ok) b.rollback(start);
  return ok;
}

/** Satteldach auf einem 8x6-Haus: Dachsteine vorne und hinten, First in der Mitte. */
function pitchedRoof(b: Builder, y: number): boolean {
  const start = b.size;
  if (!b.has('slope-2x2', null, 8)) return false;
  let ok = true;
  for (let x = 0; x < 8 && ok; x += 2) {
    ok = b.place('slope-2x2', x, y, 4, 0, 'dach') && b.place('slope-2x2', x, y, 0, 2, 'dach');
  }
  ok = ok && b.strip(0, y, 2, 8, 'x', 'dach');
  if (!ok) b.rollback(start);
  return ok;
}

function flatRoof(b: Builder, y: number): boolean {
  const start = b.size;
  const ok = b.strip(0, y, 2, 8, 'x', 'dach');
  if (!ok) b.rollback(start);
  return ok;
}

export const skyscraper: Recipe = {
  id: 'hochhaus',
  category: 'haeuser',
  emoji: '🏢',
  names: ['Hochhaus', 'Turm-Haus', 'Hotel Hoch-Hinaus', 'Stockwerk-Haus'],
  min: 22,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const perFloor = 18;
    const roofCost = b.has('slope-2x2', null, 8) ? 10 : 2;
    const floors = Math.max(1, Math.round((ctx.target - roofCost - 2) / perFloor));
    let li = 0;
    let builtFloors = 0;
    for (let f = 0; f < floors; f++) {
      const start = b.size;
      const y0 = f * 6;
      let frame = false;
      // Tür- und Fensterrahmen sind 2x4x3 und füllen die Mitte der 2 Noppen dicken Vorderwand.
      if (f === 0 && b.has('door')) frame = b.place('door', 2, 0, 4, 0, 'tuer');
      else if (f > 0 && b.has('window')) frame = b.place('window', 2, y0, 4, 0, 'fenster');
      // Ohne Rahmen: eine Fenster-Lücke in einer ungeraden Ebene, damit die Ebene darüber sie überbrückt.
      const holeK = (li + 0) % 2 === 1 ? 0 : 1;
      let ok = true;
      for (let k = 0; k < 3 && ok; k++) {
        const gap = frame || (f === 0 ? k < 2 : k === holeK);
        ok = houseLayer(b, li + k, y0 + k * 2, gap);
      }
      if (!ok) {
        b.rollback(start);
        break;
      }
      li += 3;
      builtFloors++;
    }
    if (builtFloors === 0) return null;
    const roofY = li * 2;
    // Damit der Dachrand über den Fenstern hält: eine geschlossene Ebene obenauf.
    if (!houseLayer(b, li, roofY, false)) return null;
    const topY = roofY + 2;
    const pitched = pitchedRoof(b, topY);
    if (!pitched && !flatRoof(b, topY)) return null;
    placeTopper(b, ctx.rng, { options: ['figure', 'flower'] });
    return {
      placements: b.placements,
      roles: [
        wallRole(ctx, ['weiss', 'gelb', 'grau', 'hellblau', 'rot']),
        ROOF_ROLE,
        { id: 'tuer', prefer: ['rot', 'blau', 'gelb'] },
        { id: 'fenster', mixed: true },
        { id: 'deko', mixed: true },
      ],
      name: builtFloors >= 4 ? 'Wolkenkratzer' : ctx.rng.pick(this.names),
      tips: builtFloors >= 4 ? ['Ganz schön hoch! Am besten auf einer Grundplatte bauen.'] : [],
    };
  },
};

/** Kleines Haus von vorne: Tür, Fenster-Stützen und ein Giebeldach. */
export const house: Recipe = {
  id: 'haus',
  category: 'haeuser',
  emoji: '🏠',
  names: ['Haus', 'Häuschen', 'Puppenhaus', 'Oma-Haus', 'Ferienhaus'],
  min: 9,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    // Pfeiler links und rechts, dazwischen Tür (oder offener Eingang).
    const door = b.has('door') && b.place('door', 2, 0, 0, 0, 'tuer');
    const pier = door ? 3 : 2;
    for (let k = 0; k < pier; k++) {
      if (!b.place('brick-2x2', 0, k * 2, 0, 0, 'wand') && !b.place('tall-2x2', 0, k * 2, 0, 0, 'wand')) return null;
      if (!b.place('brick-2x2', 6, k * 2, 0, 0, 'wand')) return null;
    }
    let y = pier * 2;
    const roofParts = b.has('slope-2x2', null, 4) ? 5 : 3;
    const deco = 3;
    const extra = Math.max(0, Math.min(6, Math.round((ctx.target - b.size - 2 - roofParts - deco) / 2)));
    for (let k = 0; k <= extra; k++) {
      if (!b.strip(0, y, 0, 8, 'x', 'wand', { reverse: k % 2 === 1 })) {
        if (k === 0) return null;
        break;
      }
      y += 2;
    }
    // Giebeldach
    const start = b.size;
    let roofOk =
      b.has('slope-2x2', null, 4) &&
      b.place('slope-2x2', 0, y, 0, 1, 'dach') &&
      b.strip(2, y, 0, 4, 'x', 'dach') &&
      b.place('slope-2x2', 6, y, 0, 3, 'dach') &&
      b.place('slope-2x2', 2, y + 2, 0, 1, 'dach') &&
      b.place('slope-2x2', 4, y + 2, 0, 3, 'dach');
    if (!roofOk) {
      b.rollback(start);
      roofOk = b.strip(2, y, 0, 4, 'x', 'dach') && b.place('brick-2x2', 3, y + 2, 0, 0, 'dach');
      if (!roofOk) b.rollback(start);
    }
    // Garten: Blumen, Figur vor der Tür
    if (b.has('flower')) b.place('flower', 0, 0, 3, 0, 'deko');
    if (b.has('flower')) b.place('flower', 6, 0, 3, 0, 'deko');
    if (b.has('figure')) b.placeColored('figure', 3, 0, 3, 0, null, 'deko');
    if (b.has('flower') && ctx.rng.chance(0.5)) b.placeOn('flower', 'deko');
    return {
      placements: b.placements,
      roles: [
        wallRole(ctx, ['gelb', 'weiss', 'rot', 'blau', 'orange']),
        ROOF_ROLE,
        { id: 'tuer', prefer: ['rot', 'blau', 'gruen'] },
        { id: 'deko', mixed: true },
      ],
      name: ctx.rng.pick(this.names),
    };
  },
};
