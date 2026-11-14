import { getPart } from '../parts/catalog';
import { Builder, placeTopper } from './builder';
import type { Recipe } from './types';

/** Oberkante eines Teils in Halb-Ebenen (z. B. Auto-Basis mit Rädern: 3 = 1½ Steine). */
const topOf = (part: string, y = 0) => y + getPart(part).h;

/** Auto (Cabrio mit Fahrer) oder Laster mit Ladung – braucht eine Auto-Basis. */
export const car: Recipe = {
  id: 'auto',
  category: 'fahrzeuge',
  emoji: '🚗',
  names: ['Flitzer', 'Rennauto', 'Cabrio Carlo', 'Familienauto'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const base = b.has('car-2x6') ? 'car-2x6' : b.has('wagon-2x6') ? 'wagon-2x6' : null;
    if (!base || !b.place(base, 0, 0, 0, 0, 'basis')) return null;
    const top = topOf(base);
    const truck = ctx.target >= 8;
    if (!truck) {
      if (!b.place('brick-2x2', 0, top, 0, 0, 'karosserie')) return null;
      if (b.has('figure')) {
        b.placeColored('figure', 2, top, 0, 3, null, 'deko');
        if (ctx.target >= 6 && b.has('figure')) b.placeColored('figure', 3, top, 0, 3, null, 'deko');
      } else b.place('brick-2x2', 2, top, 0, 0, 'sitz');
      if (!b.place('slope-2x2', 4, top, 0, 3, 'karosserie') && !b.place('brick-2x2', 4, top, 0, 0, 'karosserie')) return null;
      if (ctx.target >= 5 && b.has('flower')) b.placeOn('flower', 'deko', { near: [1, 1], y: top + 2 });
      return {
        placements: b.placements,
        roles: [
          { id: 'basis', prefer: ['rot', 'blau', 'gelb'] },
          { id: 'karosserie', prefer: ['rot', 'blau', 'gelb', 'gruen'] },
          { id: 'sitz', prefer: ['schwarz', 'grau', 'weiss'] },
          { id: 'deko', mixed: true },
        ],
        name: ctx.rng.pick(this.names),
      };
    }
    // Laster: Fahrerhaus vorne, Ladung hinten
    const cab = b.place('brick-2x2', 4, top, 0, 0, 'fuehrerhaus') && b.place('brick-2x2', 4, top + 2, 0, 0, 'fuehrerhaus');
    if (!cab) return null;
    const face =
      b.place('brick-2x4', 4, top + 4, -1, 1, 'fuehrerhaus', 'eyes') || b.place('slope-2x2', 4, top + 4, 0, 3, 'fuehrerhaus');
    let y = top;
    let loads = 0;
    while (b.size < ctx.target - 1 && y < top + 16) {
      const rot = loads % 2 === 0 ? 0 : 1;
      const ok = rot === 0 ? b.place('brick-2x4', 0, y, 0, 0, 'ladung') : b.place('brick-2x2', 1, y, 0, 0, 'ladung');
      if (!ok && !b.place('brick-2x2', 0, y, 0, 0, 'ladung')) break;
      y += 2;
      loads++;
    }
    if (loads === 0) return null;
    placeTopper(b, ctx.rng, { options: ['figure', 'flower', 'animal'] });
    return {
      placements: b.placements,
      roles: [
        { id: 'basis', prefer: ['rot', 'blau', 'gelb'] },
        { id: 'fuehrerhaus', prefer: ['rot', 'gelb', 'blau', 'orange'] },
        { id: 'ladung', mixed: true },
        { id: 'deko', mixed: true },
      ],
      name: face ? 'Laster Lutz' : ctx.rng.pick(['Laster', 'Kipplaster', 'Lieferwagen']),
    };
  },
};

/** Zug: Lok vorne (rechts) und Wagen mit Ladung. */
export const train: Recipe = {
  id: 'zug',
  category: 'fahrzeuge',
  emoji: '🚂',
  names: ['Bimmelbahn', 'Lok Lotte', 'Express-Zug', 'Tschu-Tschu-Zug'],
  min: 5,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const bases = ctx.budget.count('wagon-2x6') + ctx.budget.count('car-2x6');
    if (bases === 0) return null;
    const locoParts = 7;
    const wagons = Math.max(0, Math.min(bases - 1, Math.round((ctx.target - locoParts) / 3.5)));
    const base = () => (b.has('wagon-2x6') ? 'wagon-2x6' : 'car-2x6');
    // Wagen von links nach rechts, dann die Lok
    for (let k = 0; k < wagons; k++) {
      const x = k * 7;
      const part = base();
      if (!b.place(part, x, 0, 0, 0, 'wagen')) return null;
      const top = topOf(part);
      const kind = ctx.rng.pick(['kisten', 'passagier', 'blumen', 'tier'] as const);
      if (kind === 'passagier' && b.has('figure')) {
        b.placeColored('figure', x + 1, top, 0, 0, null, 'deko');
        b.place('brick-2x2', x + 3, top, 0, 0, 'ladung');
      } else if (kind === 'blumen' && b.has('flower', null, 2)) {
        b.place('flower', x, top, 0, 0, 'deko');
        b.place('flower', x + 3, top, 0, 0, 'deko');
      } else if (kind === 'tier' && b.has('animal')) {
        b.placeColored('animal', x + 1, top, 0, 0, null, 'deko');
      } else {
        if (!b.place('brick-2x4', x + 1, top, 0, 0, 'ladung') && !b.place('brick-2x2', x + 2, top, 0, 0, 'ladung')) return null;
        b.place('brick-2x2', x + 2, top + 2, 0, 0, 'ladung');
      }
    }
    // Lok: Führerhaus hinten (links), Kessel vorne (rechts)
    const lx = wagons * 7;
    const part = base();
    if (!b.place(part, lx, 0, 0, 0, 'lok')) return null;
    const top = topOf(part);
    const ok =
      b.place('brick-2x2', lx, top, 0, 0, 'lok') &&
      b.place('brick-2x2', lx, top + 2, 0, 0, 'lok') &&
      b.place('brick-2x2', lx + 2, top, 0, 0, 'kessel');
    if (!ok) return null;
    const face = b.place('brick-2x4', lx + 4, top, -1, 1, 'kessel', 'eyes') || b.place('brick-2x2', lx + 4, top, 0, 0, 'kessel');
    if (!face) return null;
    if (!b.place('tall-1x2', lx + 2, top + 2, 0, 0, 'schornstein')) b.place('brick-2x2', lx + 2, top + 2, 0, 0, 'schornstein');
    if (!b.place('slope-2x2', lx, top + 4, 0, 0, 'dach')) b.place('brick-2x2', lx, top + 4, 0, 0, 'dach');
    return {
      placements: b.placements,
      roles: [
        { id: 'lok', prefer: ['rot', 'blau', 'gruen'] },
        { id: 'kessel', prefer: ['schwarz', 'blau', 'rot', 'gruen'] },
        { id: 'schornstein', prefer: ['schwarz', 'grau', 'rot'] },
        { id: 'dach', prefer: ['schwarz', 'rot', 'blau'] },
        { id: 'wagen', mixed: true },
        { id: 'ladung', mixed: true },
        { id: 'deko', mixed: true },
      ],
      name: wagons >= 3 ? 'Langer Güterzug' : ctx.rng.pick(this.names),
    };
  },
};

/** Rakete: zwei Flossen, darüber eine „Düse“, gestreifter Rumpf, spitze Nase und ein Astronaut. */
export const rocket: Recipe = {
  id: 'rakete',
  category: 'fantasie',
  emoji: '🚀',
  names: ['Rakete Rudi', 'Mond-Rakete', 'Sternen-Flitzer'],
  min: 7,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    // Beide Flossen gleich hoch: zwei Dachsteine (1½ hoch) oder zwei kleine Steine.
    const fins = b.has('slope-2x2', null, 2)
      ? b.place('slope-2x2', -2, 0, 0, 1, 'flossen') && b.place('slope-2x2', 2, 0, 0, 3, 'flossen')
      : b.place('brick-2x2', -2, 0, 0, 0, 'flossen') && b.place('brick-2x2', 2, 0, 0, 0, 'flossen');
    if (!fins) return null;
    const finTop = topOf(b.placements[0].part);
    if (!b.place('brick-2x4', -1, finTop, 0, 0, 'rumpf')) return null;
    const noseParts = 4;
    const body = Math.max(1, Math.min(24, ctx.target - b.size - noseParts));
    let y = finTop + 2;
    for (let k = 0; k < body; k++, y += 2) {
      if (!b.place('brick-2x2', 0, y, 0, 0, 'rumpf') && !b.place('brick-2x3', 0, y, 0, 0, 'rumpf')) {
        if (k === 0) return null;
        break;
      }
    }
    if (!b.place('brick-2x4', -1, y, 0, 0, 'spitze')) return null;
    y += 2;
    const start = b.size;
    const nose = b.place('slope-2x2', -1, y, 0, 1, 'spitze') && b.place('slope-2x2', 1, y, 0, 3, 'spitze');
    if (!nose) {
      b.rollback(start);
      b.place('brick-2x2', 0, y, 0, 0, 'spitze');
    }
    placeTopper(b, ctx.rng, { options: ['figure', 'flower'] });
    const stripes = ctx.rng.pick([['weiss', 'rot'], ['weiss', 'blau'], ['grau', 'orange'], ['weiss', 'hellblau']] as const);
    return {
      placements: b.placements,
      roles: [
        { id: 'rumpf', mixed: true, sequence: [...stripes] },
        { id: 'flossen', prefer: ['rot', 'orange', 'blau'] },
        { id: 'spitze', prefer: ['rot', 'orange', 'blau'] },
        { id: 'deko', mixed: true },
      ],
      name: body >= 10 ? 'Riesen-Rakete' : ctx.rng.pick(this.names),
      tips: body >= 12 ? ['Hoch hinaus! Am besten auf einer Grundplatte bauen.'] : [],
    };
  },
};
