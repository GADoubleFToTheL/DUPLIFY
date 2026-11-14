import { RAINBOW } from '../colors';
import { bottomCells, columnKey, footprintSize } from '../grid';
import { getPart } from '../parts/catalog';
import type { PartId, Placement, Rot } from '../types';
import { placeHead } from './animals';
import { Builder, isStackable, placeTopper, topColors } from './builder';
import type { Recipe } from './types';

/** Burg mit zwei Türmen, Mauer, Tor (Bogen) und Zinnen. */
export const castle: Recipe = {
  id: 'burg',
  category: 'fantasie',
  emoji: '🏰',
  names: ['Ritterburg', 'Burg Wackelstein', 'Prinzessinnen-Schloss', 'Drachenburg'],
  min: 18,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const gate = b.place('arch-2x4', 4, 0, 0, 0, 'tor');
    for (const y of [0, 2]) {
      const ok =
        b.place('brick-2x2', 0, y, 0, 0, 'mauer') &&
        b.place('brick-2x2', 2, y, 0, 0, 'mauer') &&
        b.place('brick-2x2', 8, y, 0, 0, 'mauer') &&
        b.place('brick-2x2', 10, y, 0, 0, 'mauer');
      if (!ok) return null;
    }
    // Ebene über dem Tor: Steine laufen von Mauer zu Mauer
    const deck =
      b.place('brick-2x2', 0, 4, 0, 0, 'mauer') &&
      b.place('brick-2x4', 2, 4, 0, 0, 'mauer') &&
      b.place('brick-2x4', 6, 4, 0, 0, 'mauer') &&
      b.place('brick-2x2', 10, 4, 0, 0, 'mauer');
    if (!deck) return null;
    // Zinnen
    b.place('brick-2x2', 3, 6, 0, 0, 'mauer');
    b.place('brick-2x2', 7, 6, 0, 0, 'mauer');
    // Türme wachsen mit der Zielgröße
    const towerLayers = Math.max(1, Math.min(10, Math.floor((ctx.target - b.size - 2) / 2)));
    let y = 6;
    for (let k = 0; k < towerLayers; k++, y += 2) {
      if (!b.place('brick-2x2', 0, y, 0, 0, 'mauer') || !b.place('brick-2x2', 10, y, 0, 0, 'mauer')) break;
    }
    const roofL = b.placeOn('slope-2x2', 'dach', { y, near: [1, 1], rot: 3 }) || placeTopper(b, ctx.rng, { y, near: [1, 1] });
    const roofR = b.placeOn('slope-2x2', 'dach', { y, near: [11, 1], rot: 1 }) || placeTopper(b, ctx.rng, { y, near: [11, 1] });
    void roofL;
    void roofR;
    if (b.has('figure')) b.placeOn('figure', 'deko', { y: 8, near: [6, 1], color: null });
    return {
      placements: b.placements,
      roles: [
        { id: 'mauer', prefer: ['grau', 'weiss', 'beige', 'braun', 'gelb'] },
        { id: 'tor', prefer: ['braun', 'rot', 'blau'] },
        { id: 'dach', prefer: ['rot', 'blau', 'lila'], differentFrom: ['mauer'] },
        { id: 'deko', mixed: true },
      ],
      name: gate ? ctx.rng.pick(this.names) : 'Burg ohne Tor',
    };
  },
};

/** Brücke aus Bögen (oder Pfeilern mit langen Steinen) mit Fahrbahn. */
export const bridge: Recipe = {
  id: 'bruecke',
  category: 'fantasie',
  emoji: '🌉',
  names: ['Brücke', 'Regenbogen-Brücke', 'Trollbrücke'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    let x = 0;
    const arches = Math.max(1, Math.min(6, Math.round(ctx.target / 3)));
    for (let k = 0; k < arches; k++) {
      if (b.place('arch-2x8', x, 0, 0, 0, 'boegen')) x += 8;
      else if (b.place('arch-2x4', x, 0, 0, 0, 'boegen')) x += 4;
      else break;
    }
    let deckY = 4;
    if (x === 0) {
      // Ohne Bögen: zwei Pfeiler und ein langer Stein darüber
      const span = [10, 8, 6].find((l) => b.has(`brick-2x${l}`));
      if (!span) return null;
      const pillarH = Math.max(1, Math.min(4, Math.round((ctx.target - 2) / 2)));
      for (let k = 0; k < pillarH; k++) {
        if (!b.place('brick-2x2', 0, k * 2, 0, 0, 'pfeiler') || !b.place('brick-2x2', span - 2, k * 2, 0, 0, 'pfeiler')) return null;
      }
      deckY = pillarH * 2;
      if (!b.place(`brick-2x${span}`, 0, deckY, 0, 0, 'fahrbahn')) return null;
      x = span;
      deckY += 2;
    } else {
      // Bei größeren Zielen: Pfeiler an beiden Enden, die Fahrbahn wird länger.
      let from = 0;
      let to = x;
      if (ctx.target - b.size >= 6) {
        const start = b.size;
        const ok =
          b.place('brick-2x2', -2, 0, 0, 0, 'pfeiler') &&
          b.place('brick-2x2', -2, 2, 0, 0, 'pfeiler') &&
          b.place('brick-2x2', x, 0, 0, 0, 'pfeiler') &&
          b.place('brick-2x2', x, 2, 0, 0, 'pfeiler');
        if (ok) {
          from = -2;
          to = x + 2;
        } else b.rollback(start);
      }
      if (!b.strip(from, deckY, 0, to - from, 'x', 'fahrbahn', { prefer: [4, 2, 6, 8, 10] })) return null;
      deckY += 2;
    }
    // Geländer an den Enden und etwas zum Drüberlaufen
    if (b.size < ctx.target) b.place('brick-2x2', 0, deckY, 0, 0, 'gelaender');
    if (b.size < ctx.target) b.place('brick-2x2', x - 2, deckY, 0, 0, 'gelaender');
    if (b.size < ctx.target) placeTopper(b, ctx.rng, { y: deckY, near: [x / 2, 1] });
    return {
      placements: b.placements,
      roles: [
        { id: 'boegen', mixed: true, sequence: RAINBOW.slice() },
        { id: 'pfeiler', prefer: ['grau', 'braun', 'blau'] },
        { id: 'fahrbahn', prefer: ['grau', 'schwarz', 'braun', 'blau'] },
        { id: 'gelaender', prefer: ['rot', 'gelb', 'weiss'] },
        { id: 'deko', mixed: true },
      ],
      name: x >= 12 ? 'Lange Brücke' : ctx.rng.pick(this.names),
    };
  },
};

/** Treppe – Stufe für Stufe nach oben, oben wartet eine Figur. */
export const stairs: Recipe = {
  id: 'treppe',
  category: 'fantasie',
  emoji: '🪜',
  names: ['Treppe', 'Himmelsleiter', 'Stufen-Turm'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    let n = 2;
    const estimate = (k: number) => {
      let c = 0;
      for (let j = 0; j < k; j++) c += Math.ceil((2 * (k - j)) / 4);
      return c;
    };
    while (n < 12 && estimate(n + 1) + 1 <= ctx.target) n++;
    for (let j = 0; j < n; j++) {
      if (!b.strip(2 * j, 2 * j, 0, 2 * (n - j), 'x', 'stufen', { reverse: j % 2 === 1, prefer: [4, 2, 6, 8, 3, 10] })) {
        if (j < 2) return null;
        break;
      }
    }
    placeTopper(b, ctx.rng, { near: [2 * n, 1], options: ['figure', 'animal', 'flower'] });
    return {
      placements: b.placements,
      roles: [{ id: 'stufen', mixed: true, sequence: ctx.rng.chance(0.5) ? RAINBOW.slice() : topColors(ctx.counts, ['brick-2x4', 'brick-2x2'], 2) }],
      name: n >= 7 ? 'Himmelsleiter' : ctx.rng.pick(this.names),
    };
  },
};

/** Stufen-Pyramide: jede Ebene etwas kleiner, über Kreuz verlegt. */
export const pyramid: Recipe = {
  id: 'pyramide',
  category: 'fantasie',
  emoji: '🔺',
  names: ['Pyramide', 'Sand-Pyramide', 'Zauber-Pyramide'],
  min: 3,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const count = (s: number) => {
      let c = 0;
      for (let side = s; side >= 2; side -= 2) c += (side / 2) * Math.ceil(side / 4);
      return c;
    };
    let side = 4;
    for (let s = 4; s <= 14; s += 2) if (Math.abs(count(s) + 1 - ctx.target) < Math.abs(count(side) + 1 - ctx.target)) side = s;
    let off = 0;
    let layer = 0;
    for (let s = side; s >= 2; s -= 2, off++, layer++) {
      const y = layer * 2;
      for (let r = 0; r < s; r += 2) {
        const ok =
          layer % 2 === 0
            ? b.strip(off, y, off + r, s, 'x', 'stein', { reverse: r % 4 === 2 })
            : b.strip(off + r, y, off, s, 'z', 'stein', { reverse: r % 4 === 2 });
        if (!ok) {
          if (layer === 0) return null;
          s = 0;
          break;
        }
      }
      if (s === 0) break;
    }
    placeTopper(b, ctx.rng, {});
    const desert = ctx.rng.chance(0.5);
    return {
      placements: b.placements,
      roles: [
        desert
          ? { id: 'stein', mixed: true, sequence: ['gelb', 'beige', 'orange'] }
          : { id: 'stein', mixed: true, sequence: RAINBOW.slice() },
        { id: 'deko', mixed: true },
      ],
      name: desert ? 'Sand-Pyramide' : 'Regenbogen-Pyramide',
    };
  },
};

/** Roboter mit Beinen, Armen, Augen-Kopf und Antenne. */
export const robot: Recipe = {
  id: 'roboter',
  category: 'fantasie',
  emoji: '🤖',
  names: ['Roboter Robbi', 'Robo-Max', 'Blechbert'],
  min: 9,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    const legH = ctx.target >= 14 ? 3 : 2;
    for (let k = 0; k < legH; k++) {
      if (!b.place('brick-2x2', 0, k * 2, 0, 0, 'beine') || !b.place('brick-2x2', 4, k * 2, 0, 0, 'beine')) return null;
    }
    let y = legH * 2;
    if (!b.place('brick-2x6', 0, y, 0, 0, 'koerper')) {
      if (!b.place('brick-2x4', 0, y, 0, 0, 'koerper') || !b.place('brick-2x2', 4, y, 0, 0, 'koerper')) return null;
    }
    y += 2;
    if (!b.place('brick-2x4', 1, y, 0, 0, 'koerper')) return null;
    const armL = b.place('brick-2x2', -1, y, 0, 0, 'arme');
    const armR = b.place('brick-2x2', 5, y, 0, 0, 'arme');
    if (ctx.target >= 17 && armL && armR) {
      b.place('brick-2x2', -1, y + 2, 0, 0, 'arme');
      b.place('brick-2x2', 5, y + 2, 0, 0, 'arme');
    }
    y += 2;
    if (ctx.target >= 14 && b.place('brick-2x4', 1, y, 0, 0, 'koerper')) y += 2;
    const head = placeHead(b, 1, y, 0, 'kopf', false);
    if (!head) return null;
    if (head.studs) {
      if (!b.place('tall-1x2', 2, y + 2, 0, 0, 'antenne')) placeTopper(b, ctx.rng, { y: y + 2, near: [3, 1] });
    }
    return {
      placements: b.placements,
      roles: [
        { id: 'koerper', prefer: ['grau', 'weiss', 'blau', 'hellblau'] },
        { id: 'kopf', prefer: ['grau', 'weiss', 'hellblau', 'blau'] },
        { id: 'beine', prefer: ['blau', 'grau', 'schwarz'] },
        { id: 'arme', prefer: ['rot', 'orange', 'gelb'], differentFrom: ['koerper'] },
        { id: 'antenne', prefer: ['rot', 'gelb'] },
        { id: 'deko', mixed: true },
      ],
      name: ctx.rng.pick(this.names),
    };
  },
};

const SCULPT_PARTS: PartId[] = ['brick-2x2', 'brick-2x4', 'brick-2x3', 'brick-2x6', 'tall-2x2', 'slope-2x2'];

function mirrorRot(part: PartId, rot: Rot): Rot {
  if (getPart(part).kind === 'slope') return rot === 1 ? 3 : rot === 3 ? 1 : rot;
  return rot;
}

/** Überraschungs-Skulptur: ein spiegelsymmetrischer Zufallsbau aus euren Steinen. */
export const sculpture: Recipe = {
  id: 'skulptur',
  category: 'fantasie',
  emoji: '✨',
  names: ['Kunstwerk', 'Zauber-Schloss', 'Fantasie-Turm', 'Wackel-Burg', 'Traum-Palast'],
  min: 4,
  generate(ctx) {
    const b = new Builder(ctx.budget);
    if (!b.place('brick-2x4', -2, 0, -1, 0, 'kunst') && !b.place('brick-2x2', -1, 0, -1, 0, 'kunst')) return null;
    const goal = ctx.target - 1;
    let guard = 0;
    while (b.size < goal && guard++ < 400) {
      const top = b.top;
      const y = ctx.rng.chance(0.7) ? top - 0 : Math.max(2, top - 2 * ctx.rng.int(1, 3));
      const studs = b.studsAt(y);
      if (studs.size === 0) continue;
      // Eure eigenen Originalteile aus der Kiste dürfen mitspielen.
      const usable = [...SCULPT_PARTS, ...b.budget.catalogParts().filter(isStackable)].filter((p) => b.has(p));
      if (usable.length === 0) break;
      const part = ctx.rng.pick(usable);
      const rot = (ctx.rng.chance(0.5) ? 0 : 1) as Rot;
      const def = getPart(part);
      const { w, l } = footprintSize(def, rot);
      const cells = [...studs].map((k) => k.split(',').map(Number));
      const [sx, sz] = ctx.rng.pick(cells);
      const x = sx - ctx.rng.int(0, w - 1);
      const z = sz - ctx.rng.int(0, l - 1);
      const supported = (p: Placement) =>
        bottomCells(p).filter((c) => studs.has(columnKey(c.x, c.z))).length >= Math.min(2, bottomCells(p).length);
      const p: Placement = { part, x, y, z, rot, color: null };
      if (!supported(p) || !b.fits(part, x, y, z, rot)) continue;
      const mx = -x - w;
      const selfMirror = mx === x;
      const m: Placement = { part, x: mx, y, z, rot: mirrorRot(part, rot), color: null };
      if (!selfMirror) {
        if (!b.has(part, null, 2) || !supported(m)) continue;
        const start = b.size;
        if (!b.place(part, x, y, z, rot, 'kunst')) continue;
        if (!b.place(part, mx, y, z, m.rot, 'kunst')) {
          b.rollback(start);
          continue;
        }
      } else if (!b.place(part, x, y, z, rot, 'kunst')) continue;
    }
    if (b.size < 3) return null;
    placeTopper(b, ctx.rng, { near: [0, 0] });
    return {
      placements: b.placements,
      roles: [
        ctx.rng.chance(0.6)
          ? { id: 'kunst', mixed: true, sequence: RAINBOW.slice(ctx.rng.int(0, 5)) }
          : { id: 'kunst', mixed: true, sequence: topColors(ctx.counts, SCULPT_PARTS, 3) },
        { id: 'deko', mixed: true },
      ],
      name: ctx.rng.pick(this.names),
    };
  },
};
