import type { RoleDef } from '../types';
import { Builder } from './builder';
import type { Recipe, RecipeContext } from './types';

/**
 * Kopf mit Augen (seitlich sichtbar). Versucht erst den runden Augenstein, dann den 2x4-Augenstein,
 * sonst einen schlichten Stein. `x` ist die hintere Kante des Kopfes.
 */
export function placeHead(
  b: Builder,
  x: number,
  y: number,
  z: number,
  role = 'kopf',
  preferRound = true,
): { eyes: boolean; studs: boolean } | null {
  const order: [() => boolean, { eyes: boolean; studs: boolean }][] = [
    [() => b.place('curved-2x3', x, y, z, 0, role, 'eyes'), { eyes: true, studs: false }],
    [() => b.place('brick-2x4', x, y, z, 0, role, 'eyes'), { eyes: true, studs: true }],
  ];
  if (!preferRound) order.reverse();
  for (const [fn, kind] of order) if (fn()) return kind;
  if (b.place('curved-2x3', x, y, z, 0, role)) return { eyes: false, studs: false };
  if (b.place('brick-2x4', x, y, z, 0, role)) return { eyes: false, studs: true };
  if (b.place('brick-2x2', x, y, z, 0, role)) return { eyes: false, studs: true };
  return null;
}

/** Stein 2x4 oder ersatzweise 2x2 + 2x2 an derselben Stelle (entlang x). */
function bar4(b: Builder, x: number, y: number, z: number, role: string): boolean {
  if (b.place('brick-2x4', x, y, z, 0, role)) return true;
  const start = b.size;
  if (b.place('brick-2x2', x, y, z, 0, role) && b.place('brick-2x2', x + 2, y, z, 0, role)) return true;
  b.rollback(start);
  return false;
}

/** Ente: Körper, Schwanz, Hals, Schnabel und Kopf mit Augen. Größere Ziele → Entenfamilie. */
function buildDuck(b: Builder, ox: number, oz: number, big: boolean, n = 0): boolean {
  const start = b.size;
  const body = `koerper${n}`;
  const beak = `schnabel${n}`;
  const head = `kopf${n}`;
  const ok = (() => {
    if (big) {
      if (!b.strip(ox, 0, oz, 8, 'x', body)) return false;
      if (!b.place('brick-2x2', ox, 2, oz, 0, body)) return false;
      if (!b.strip(ox + 2, 2, oz, 6, 'x', body, { prefer: [6, 4, 2], reverse: true })) return false;
      if (!b.place('slope-2x2', ox, 4, oz, 3, body) && !b.place('brick-2x2', ox, 4, oz, 0, body)) return false;
      if (!b.place('brick-2x2', ox + 4, 4, oz, 0, body)) return false;
      if (!b.place('brick-2x2', ox + 6, 4, oz, 0, beak)) return false;
      return placeHead(b, ox + 4, 6, oz, head) !== null;
    }
    if (!bar4(b, ox, 0, oz, body)) return false;
    if (!b.place('brick-2x2', ox, 2, oz, 0, body)) return false;
    if (!b.place('brick-2x4', ox + 2, 2, oz, 0, body)) return false;
    if (!b.place('slope-2x2', ox, 4, oz, 3, body) && !b.place('brick-2x2', ox, 4, oz, 0, body)) return false;
    if (!b.place('brick-2x2', ox + 2, 4, oz, 0, body)) return false;
    if (!b.place('brick-2x2', ox + 4, 4, oz, 0, beak)) return false;
    return placeHead(b, ox + 2, 6, oz, head) !== null;
  })();
  if (!ok) b.rollback(start);
  return ok;
}

export const duck: Recipe = {
  id: 'ente',
  category: 'tiere',
  emoji: '🦆',
  names: ['Ente Erna', 'Ente Emil', 'Quietsche-Ente', 'Ente Paula'],
  min: 7,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const big = ctx.target >= 11;
    if (!buildDuck(b, 0, 0, big)) return null;
    let kids = 0;
    while (b.size + 7 <= ctx.target + 3 && kids < 4) {
      if (!buildDuck(b, 1 + kids * 7, 4, false, kids + 1)) break;
      kids++;
    }
    const roles: RoleDef[] = [];
    for (let n = 0; n <= kids; n++) {
      roles.push(
        { id: `koerper${n}`, prefer: ['gelb', 'weiss', 'orange'] },
        { id: `kopf${n}`, prefer: ['gelb', 'weiss', 'orange'] },
        { id: `schnabel${n}`, prefer: ['orange', 'rot'], differentFrom: [`koerper${n}`] },
      );
    }
    return {
      placements: b.placements,
      roles,
      name: kids > 0 ? 'Entenfamilie' : ctx.rng.pick(this.names),
    };
  },
};

/** Vierbeiner-Grundgerüst: Beine, Körper, Hals, Kopf. `legH` = Beinlänge in Ebenen. */
function quadruped(
  b: Builder,
  ctx: RecipeContext,
  opts: { legH: number; neck: number; neckRole: string; tail: boolean; ears: boolean; ox?: number; oz?: number },
): boolean {
  const role = 'fell';
  const ox = opts.ox ?? 0;
  const oz = opts.oz ?? 0;
  const start = b.size;
  const fail = () => {
    b.rollback(start);
    return false;
  };
  for (let k = 0; k < opts.legH; k++) {
    const y = k * 2;
    if (!b.place('brick-2x2', ox, y, oz, 0, role) || !b.place('brick-2x2', ox + 4, y, oz, 0, role)) return fail();
  }
  let y = opts.legH * 2;
  // Körper: 2x6 am Stück, sonst 2x4 + 2x2 und eine Brücke darüber
  if (!b.place('brick-2x6', ox, y, oz, 0, role)) {
    if (!b.place('brick-2x4', ox, y, oz, 0, role) || !b.place('brick-2x2', ox + 4, y, oz, 0, role)) return fail();
    y += 2;
    if (!b.place('brick-2x4', ox + 2, y, oz, 0, role)) return fail();
    if (opts.tail && !b.place('slope-2x2', ox, y, oz, 3, 'schwanz')) b.place('brick-2x2', ox, y, oz, 0, role);
  } else if (opts.tail) {
    if (!b.place('slope-2x2', ox, y + 2, oz, 3, 'schwanz')) b.place('brick-2x2', ox, y + 2, oz, 0, role);
  }
  y += 2;
  for (let k = 0; k < opts.neck; k++) {
    if (!b.place('brick-2x2', ox + 4, y, oz, 0, opts.neckRole)) return fail();
    y += 2;
  }
  const head = placeHead(b, ox + 4, y, oz, 'kopf', ctx.rng.chance(0.5));
  if (!head) return fail();
  if (opts.ears && head.studs) b.place('brick-2x2', ox + 4, y + 2, oz, 0, 'ohren');
  return true;
}

export const dog: Recipe = {
  id: 'hund',
  category: 'tiere',
  emoji: '🐶',
  names: ['Hund Bello', 'Hund Fips', 'Dackel Waldi', 'Hund Struppi'],
  min: 7,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const legH = ctx.target >= 12 ? 2 : 1;
    if (!quadruped(b, ctx, { legH, neck: 1, neckRole: 'fell', tail: true, ears: ctx.target >= 9 })) return null;
    // Bei größeren Zielen kommen Welpen dazu
    let pups = 0;
    while (b.size + 7 <= ctx.target + 2 && pups < 3) {
      if (!quadruped(b, ctx, { legH: 1, neck: 0, neckRole: 'fell', tail: false, ears: false, ox: 1 + pups * 8, oz: 4 })) break;
      pups++;
    }
    if (b.size < ctx.target - 3 && b.has('flower')) b.place('flower', 7, 0, 0, 0, 'deko');
    return {
      placements: b.placements,
      roles: [
        { id: 'fell', prefer: ['braun', 'beige', 'weiss', 'schwarz', 'orange'] },
        { id: 'beine', prefer: ['braun', 'beige', 'weiss', 'schwarz'] },
        { id: 'kopf', prefer: ['braun', 'beige', 'weiss'] },
        { id: 'schwanz', prefer: ['braun', 'schwarz'] },
        { id: 'ohren', prefer: ['schwarz', 'braun'], differentFrom: ['kopf'] },
        { id: 'deko', mixed: true },
      ],
      name: pups > 0 ? 'Hund mit Welpen' : ctx.rng.pick(this.names),
    };
  },
};

export const giraffe: Recipe = {
  id: 'giraffe',
  category: 'tiere',
  emoji: '🦒',
  names: ['Giraffe Gisela', 'Giraffe Greta', 'Lange Lotte'],
  min: 10,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const base = 2 * 2 + 3 + 1;
    const neck = Math.max(2, Math.min(20, ctx.target - base - 1));
    if (!quadruped(b, ctx, { legH: 2, neck, neckRole: 'hals', tail: true, ears: false })) return null;
    return {
      placements: b.placements,
      roles: [
        { id: 'fell', prefer: ['gelb', 'orange', 'beige'] },
        { id: 'beine', prefer: ['gelb', 'orange', 'beige'] },
        { id: 'hals', mixed: true, sequence: ['gelb', 'orange'] },
        { id: 'kopf', prefer: ['gelb', 'orange', 'beige'] },
        { id: 'schwanz', prefer: ['orange', 'braun'] },
      ],
      name: neck >= 8 ? 'Riesen-Giraffe' : ctx.rng.pick(this.names),
      tips: neck >= 10 ? ['Langer Hals! Beim Bauen gut festhalten.'] : [],
    };
  },
};

export const snake: Recipe = {
  id: 'schlange',
  category: 'tiere',
  emoji: '🐍',
  names: ['Schlange Sissi', 'Schlange Schorsch', 'Ringel-Schlange'],
  min: 4,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const segments = Math.max(3, Math.min(30, ctx.target - 1));
    // Unten bei x = 0, 6, 12 …; oben verbindend bei x = 3, 9, 15 …
    let x = 0;
    for (let k = 0; k < segments - 1; k++) {
      const top = k % 2 === 1;
      if (!b.place('brick-2x4', x, top ? 2 : 0, 0, 0, 'haut')) break;
      x += 3;
    }
    if (b.size < 2) return null;
    // Kopf auf das letzte Stück setzen
    const last = b.placements[b.placements.length - 1];
    const headY = last.y + 2;
    if (!placeHead(b, last.x + 1, headY, 0, 'kopf') && !b.placeOn('brick-2x2', 'kopf', { y: headY })) return null;
    return {
      placements: b.placements,
      roles: [
        { id: 'haut', mixed: true, sequence: ctx.rng.pick([['gruen', 'gelb'], ['hellgruen', 'gruen'], ['rot', 'gelb'], ['blau', 'hellblau']]) },
        { id: 'kopf', prefer: ['gruen', 'hellgruen', 'gelb'] },
      ],
      name: segments > 12 ? 'Riesen-Schlange' : ctx.rng.pick(this.names),
    };
  },
};

export const dino: Recipe = {
  id: 'dino',
  category: 'tiere',
  emoji: '🦖',
  names: ['Dino Rex', 'Dino Dodo', 'Drache Fridolin', 'Stegi'],
  min: 12,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const ok =
      b.place('brick-2x2', -2, 0, 0, 0, 'haut') &&
      b.place('brick-2x2', 2, 0, 0, 0, 'beine') &&
      b.place('brick-2x2', 6, 0, 0, 0, 'beine') &&
      b.place('brick-2x4', -2, 2, 0, 0, 'haut') &&
      b.place('brick-2x2', 2, 2, 0, 0, 'beine') &&
      b.place('brick-2x2', 6, 2, 0, 0, 'beine') &&
      bar4(b, 0, 4, 0, 'haut') &&
      b.place('brick-2x4', 4, 4, 0, 0, 'haut') &&
      b.place('brick-2x4', 2, 6, 0, 0, 'haut') &&
      b.place('brick-2x2', 6, 6, 0, 0, 'haut');
    if (!ok) return null;
    let y = 8;
    const neck = ctx.target >= 20 ? 2 : 1;
    for (let k = 0; k < neck; k++, y += 2) if (!b.place('brick-2x2', 6, y, 0, 0, 'haut')) return null;
    if (!placeHead(b, 6, y, 0, 'kopf', false)) return null;
    // Zacken auf dem Rücken (Sägezahn aus Dachsteinen)
    let spikes = 0;
    if (b.place('slope-2x2', 0, 6, 0, 1, 'zacken')) spikes++;
    if (b.place('slope-2x2', 2, 8, 0, 1, 'zacken')) spikes++;
    if (b.place('slope-2x2', 4, 8, 0, 1, 'zacken')) spikes++;
    if (spikes === 0 && b.has('brick-2x2')) {
      b.place('brick-2x2', 2, 8, 0, 0, 'zacken');
    }
    return {
      placements: b.placements,
      roles: [
        { id: 'haut', prefer: ['gruen', 'dunkelgruen', 'hellgruen', 'blau', 'lila'] },
        { id: 'beine', prefer: ['gruen', 'dunkelgruen', 'hellgruen', 'blau', 'lila'] },
        { id: 'kopf', prefer: ['gruen', 'dunkelgruen', 'hellgruen', 'gelb'] },
        { id: 'zacken', prefer: ['orange', 'rot', 'gelb'], differentFrom: ['haut'] } satisfies RoleDef,
      ],
      name: spikes >= 2 ? 'Stegi der Zacken-Dino' : ctx.rng.pick(this.names),
    };
  },
};

export const ANIMAL_RECIPES = [duck, dog, giraffe, snake, dino];
