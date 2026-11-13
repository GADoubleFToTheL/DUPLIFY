import { RAINBOW } from '../colors';
import type { RoleDef } from '../types';
import { Builder, topColors } from './builder';
import type { Recipe } from './types';

/** Mauer im Läuferverband – mit Blumen obendrauf oder Tieren davor. */
export const wall: Recipe = {
  id: 'mauer',
  category: 'garten',
  emoji: '🧱',
  names: ['Mauer', 'Gartenmauer', 'Burgmauer'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const deco = Math.min(3, Math.floor(ctx.target / 6));
    const body = Math.max(2, ctx.target - deco);
    // Länge und Höhe passend zur Zielgröße wählen (ca. 1 großer Stein je 4 Noppen).
    let best = { len: 8, h: 2, err: Infinity };
    for (let h = 1; h <= 10; h++) {
      for (let len = 4; len <= 28; len += 2) {
        const per = Math.ceil(len / 4);
        const err = Math.abs(per * h - body) + Math.abs(len / Math.max(1, h) - 3) * 0.6;
        if (err < best.err) best = { len, h, err };
      }
    }
    for (let k = 0; k < best.h; k++) {
      const odd = k % 2 === 1;
      const ok = b.strip(0, k * 2, 0, best.len, 'x', 'mauer', {
        prefer: odd ? [2, 4, 6, 8, 10, 3] : [8, 6, 4, 10, 2, 3],
        reverse: odd,
      });
      if (!ok) {
        if (k === 0) return null;
        break;
      }
    }
    let name = ctx.rng.pick(this.names);
    let flowers = 0;
    let animals = 0;
    for (let i = 0; i < deco; i++) {
      const x = ((i + 0.5) / deco) * best.len;
      if (b.has('flower') && b.placeOn('flower', 'deko', { near: [x, 1] })) flowers++;
      else if (b.has('animal') && b.placeColored('animal', Math.round(x) - 1, 0, 2, 0, null, 'deko')) animals++;
    }
    if (flowers >= 2) name = 'Blumenmauer';
    else if (animals >= 1) name = 'Zaun für die Tiere';
    const r = ctx.rng.next();
    const top = topColors(ctx.counts, ['brick-2x2', 'brick-2x4', 'brick-2x6', 'brick-2x8'], 2);
    const role: RoleDef =
      r < 0.4
        ? { id: 'mauer', prefer: top.slice(0, 1) }
        : r < 0.75 && top.length >= 2
          ? { id: 'mauer', mixed: true, sequence: [top[0], top[1]] }
          : { id: 'mauer', mixed: true, sequence: RAINBOW.slice() };
    return { placements: b.placements, roles: [role, { id: 'deko', mixed: true }], name };
  },
};
