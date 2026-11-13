import { Builder, placeTopper } from './builder';
import type { Recipe } from './types';

/** Baum: Stamm und Krone über Kreuz. */
function tree(b: Builder, x: number, z: number): boolean {
  const start = b.size;
  const ok =
    b.place('brick-2x2', x, 0, z, 0, 'stamm') &&
    b.place('brick-2x2', x, 2, z, 0, 'stamm') &&
    b.place('brick-2x4', x - 1, 4, z, 0, 'krone') &&
    b.place('brick-2x4', x, 6, z - 1, 1, 'krone') &&
    b.place('brick-2x2', x, 8, z, 0, 'krone');
  if (!ok) b.rollback(start);
  return ok;
}

/** Blumengarten: Beete mit Blumen, Bäume, Gärtner und Tiere. */
export const garden: Recipe = {
  id: 'garten',
  category: 'garten',
  emoji: '🌼',
  names: ['Blumengarten', 'Omas Garten', 'Zaubergarten'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    let x = 0;
    let beds = 0;
    let trees = 0;
    let guard = 0;
    while (b.size < ctx.target - 1 && guard++ < 20) {
      const wantTree = (beds > 0 && trees < beds && b.size + 5 <= ctx.target) || !b.has('flower');
      if (wantTree && tree(b, x + 1, 0)) {
        trees++;
        x += 5;
        continue;
      }
      if (!b.has('flower')) break;
      if (!b.place('brick-2x4', x, 0, 0, 0, 'beet') && !b.place('brick-2x2', x, 0, 0, 0, 'beet')) break;
      b.place('flower', x, 2, 0, 0, 'blumen');
      if (b.size < ctx.target) b.place('flower', x + 2, 2, 0, 0, 'blumen');
      beds++;
      x += 5;
    }
    if (beds + trees === 0) return null;
    if (b.has('figure') && b.size < ctx.target + 2) b.placeColored('figure', x, 0, 0, 0, null, 'deko');
    if (b.has('animal') && b.size < ctx.target + 2) b.placeColored('animal', x + 3, 0, 0, 0, null, 'deko');
    return {
      placements: b.placements,
      roles: [
        { id: 'beet', prefer: ['braun', 'gruen', 'dunkelgruen'] },
        { id: 'blumen', mixed: true, sequence: ['rot', 'gelb', 'rosa', 'lila', 'orange', 'weiss'] },
        { id: 'stamm', prefer: ['braun', 'schwarz', 'beige'] },
        { id: 'krone', prefer: ['gruen', 'dunkelgruen', 'hellgruen'] },
        { id: 'deko', mixed: true },
      ],
      name: beds === 0 ? 'Kleiner Wald' : ctx.rng.pick(this.names),
    };
  },
};

/** Spielplatz: Wippe mit Kindern, Rutsche, Blumen. */
export const playground: Recipe = {
  id: 'spielplatz',
  category: 'garten',
  emoji: '🛝',
  names: ['Spielplatz', 'Abenteuer-Spielplatz', 'Wippe & Rutsche'],
  min: 10,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    let parts = 0;
    if (b.place('seesaw', 0, 0, 0, 0, 'wippe')) {
      parts++;
      if (b.has('figure')) b.placeColored('figure', 0, 3, 1, 0, null, 'deko');
      if (b.has('figure')) b.placeColored('figure', 8, 3, 1, 0, null, 'deko');
    }
    // Rutsche: Leiter-Turm und Dachsteine abwärts
    const sx = parts ? 12 : 0;
    const start = b.size;
    const slide =
      b.place('brick-2x2', sx, 0, 0, 0, 'turm') &&
      b.place('brick-2x2', sx, 2, 0, 0, 'turm') &&
      b.place('brick-2x2', sx, 4, 0, 0, 'turm') &&
      b.place('brick-2x2', sx + 2, 0, 0, 0, 'rutsche') &&
      b.place('brick-2x2', sx + 2, 2, 0, 0, 'rutsche') &&
      b.place('slope-2x2', sx + 2, 4, 0, 3, 'rutsche') &&
      b.place('brick-2x2', sx + 4, 0, 0, 0, 'rutsche') &&
      b.place('slope-2x2', sx + 4, 2, 0, 3, 'rutsche') &&
      b.place('slope-2x2', sx + 6, 0, 0, 3, 'rutsche');
    if (!slide) b.rollback(start);
    else if (b.has('figure')) b.placeColored('figure', sx, 6, 0, 0, null, 'deko');
    if (b.size === 0) return null;
    for (let k = 0; b.size < ctx.target && k < 4; k++) {
      if (!b.has('flower')) break;
      b.place('flower', k * 3, 0, 5, 0, 'deko');
    }
    if (b.size < ctx.target) placeTopper(b, ctx.rng, { options: ['animal'] });
    return {
      placements: b.placements,
      roles: [
        { id: 'wippe', prefer: ['rot', 'gelb', 'blau'] },
        { id: 'turm', prefer: ['blau', 'gelb', 'rot'] },
        { id: 'rutsche', prefer: ['rot', 'gelb', 'orange'], differentFrom: ['turm'] },
        { id: 'deko', mixed: true },
      ],
      name: ctx.rng.pick(this.names),
    };
  },
};
