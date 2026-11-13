import { RAINBOW } from '../colors';
import type { Rot, RoleDef } from '../types';
import { Builder, STRIP_PARTS, topColors } from './builder';
import type { Recipe, RecipeContext } from './types';

type Style = 'giant' | 'cross' | 'stack';

const STACKABLE = ['brick-2x2', 'brick-2x3', 'brick-2x4', 'brick-2x6', 'brick-2x8', 'brick-2x10', 'tall-2x2', 'tall-2x4'];

function rotate<T>(list: readonly T[], off: number): T[] {
  return list.map((_, i) => list[(i + off) % list.length]);
}

/** Farbschema: Regenbogen, Streifen oder einfarbig. */
export function towerColors(ctx: RecipeContext, parts: string[]): { role: RoleDef; style: 'regenbogen' | 'streifen' | 'einfarbig' } {
  const r = ctx.rng.next();
  if (r < 0.55) {
    return { role: { id: 'turm', mixed: true, sequence: rotate(RAINBOW, ctx.rng.int(0, RAINBOW.length - 1)) }, style: 'regenbogen' };
  }
  const top = topColors(ctx.counts, parts, 3);
  if (r < 0.8 && top.length >= 2) {
    return { role: { id: 'turm', mixed: true, sequence: [top[0], top[1]] }, style: 'streifen' };
  }
  return { role: { id: 'turm', prefer: top.slice(0, 1) }, style: 'einfarbig' };
}

/** Baut eine Turm-Ebene; fällt bei Bedarf auf eine schmalere Bauweise zurück. */
function layer(b: Builder, style: Style, k: number, y: number, role: string): { style: Style; h: number } | null {
  const start = b.size;
  if (style === 'giant') {
    if (b.has('brick-2x4', null, 2)) {
      const ok =
        k % 2 === 0
          ? b.place('brick-2x4', -2, y, -2, 0, role) && b.place('brick-2x4', -2, y, 0, 0, role)
          : b.place('brick-2x4', -2, y, -2, 1, role) && b.place('brick-2x4', 0, y, -2, 1, role);
      if (ok) return { style: 'giant', h: 2 };
      b.rollback(start);
    }
    style = 'cross';
  }
  if (style === 'cross') {
    const rot: Rot = k % 2 === 0 ? 0 : 1;
    const [x, z] = rot === 0 ? [-2, -1] : [-1, -2];
    if (b.place('brick-2x4', x, y, z, rot, role)) return { style: 'cross', h: 2 };
    if (b.place('tall-2x4', x, y, z, rot, role)) return { style: 'cross', h: 4 };
  }
  if (b.place('brick-2x2', -1, y, -1, 0, role)) return { style: 'stack', h: 2 };
  if (b.place('tall-2x2', -1, y, -1, 0, role)) return { style: 'stack', h: 4 };
  if (b.place('brick-2x3', -1, y, -1, 0, role)) return { style: 'stack', h: 2 };
  return null;
}

function addTopper(b: Builder, ctx: RecipeContext): string | null {
  const options = ctx.rng.shuffle(['figure', 'flower', 'animal']);
  for (const part of options) {
    if (!b.has(part)) continue;
    const color = part === 'flower' ? undefined : null;
    if (b.placeOn(part, 'deko', { near: [0, 0], color })) return part;
  }
  return null;
}

export const tower: Recipe = {
  id: 'turm',
  category: 'tuerme',
  emoji: '🗼',
  names: ['Turm', 'Kletter-Turm', 'Wolken-Turm', 'Turm Toni'],
  min: 2,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const colors = towerColors(ctx, STACKABLE);
    const topper = ctx.target >= 5 ? 1 : 0;
    const body = Math.max(2, ctx.target - topper);
    const useEyes = body >= 6 && b.has('brick-2x4', 'eyes') && ctx.rng.chance(0.6);
    // Geplante Bauweise je Ebene: breiter Fuß, schlanke Spitze.
    const plan: Style[] = [];
    let parts = 0;
    while (parts < body) {
      const left = body - parts;
      const st: Style = body >= 18 && parts < body * 0.45 && left >= 2 ? 'giant' : body >= 5 && parts < body * 0.8 ? 'cross' : 'stack';
      plan.push(st);
      parts += st === 'giant' ? 2 : 1;
    }
    let y = 0;
    let style: Style = plan[0];
    let usedEyes = false;
    for (let k = 0; b.size < body; k++) {
      if (useEyes && !usedEyes && b.size >= body - 2 && style !== 'stack') {
        if (b.place('brick-2x4', -2, y, -1, 0, 'augen', 'eyes')) {
          usedEyes = true;
          y += 2;
          continue;
        }
      }
      const planned = plan[Math.min(k, plan.length - 1)];
      const want: Style = rank(planned) > rank(style) ? planned : style;
      const res = layer(b, want, k, y, 'turm');
      if (!res) break;
      style = res.style;
      y += res.h;
    }
    if (b.size < 2) return null;
    const top = addTopper(b, ctx);
    const layers = y / 2;
    const name = usedEyes ? 'Turm-Monster' : colors.style === 'regenbogen' ? 'Regenbogen-Turm' : ctx.rng.pick(this.names);
    const tips = layers >= 16 ? ['Ganz schön hoch! Am besten auf einer Grundplatte bauen.'] : [];
    void top;
    return {
      placements: b.placements,
      roles: [colors.role, { id: 'augen', prefer: ['gelb', 'weiss', 'gruen'] }, { id: 'deko', mixed: true }],
      name,
      tips,
    };
  },
};

function rank(s: Style): number {
  return s === 'giant' ? 0 : s === 'cross' ? 1 : 2;
}

/** Mega-Turm: verbaut (fast) alle stapelbaren Steine – unten breit, oben schmal. */
export const megaTower: Recipe = {
  id: 'megaturm',
  category: 'tuerme',
  emoji: '🏰',
  names: ['Mega-Turm'],
  min: 20,
  when(ctx) {
    let stackable = 0;
    for (const p of STACKABLE) stackable += ctx.budget.count(p);
    return stackable >= 20 && ctx.target >= stackable * 0.6;
  },
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const role = 'turm';
    let y = 0;
    let k = 0;
    for (const len of [10, 8, 6]) {
      const part = STRIP_PARTS[len];
      const off = len / 2;
      while (b.has(part, null, 2)) {
        const start = b.size;
        const ok =
          k % 2 === 0
            ? b.place(part, -off, y, -2, 0, role) && b.place(part, -off, y, 0, 0, role)
            : b.place(part, -2, y, -off, 1, role) && b.place(part, 0, y, -off, 1, role);
        if (!ok) {
          b.rollback(start);
          break;
        }
        y += 2;
        k++;
      }
    }
    for (;;) {
      const res = layer(b, 'giant', k, y, role);
      if (!res || res.style !== 'giant') {
        if (res) {
          y += res.h;
          k++;
        }
        break;
      }
      y += res.h;
      k++;
    }
    for (;;) {
      const res = layer(b, 'cross', k, y, role);
      if (!res) break;
      y += res.h;
      k++;
    }
    if (b.size < 20) return null;
    addTopper(b, ctx);
    return {
      placements: b.placements,
      roles: [
        { id: 'turm', mixed: true, sequence: rotate(RAINBOW, ctx.rng.int(0, RAINBOW.length - 1)) },
        { id: 'deko', mixed: true },
      ],
      name: 'Mega-Turm',
      tips: ['Super hoch! Am besten auf einer Grundplatte bauen und gut festhalten.'],
      anySize: true,
    };
  },
};
