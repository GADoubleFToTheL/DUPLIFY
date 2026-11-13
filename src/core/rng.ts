/** Kleiner, schneller Zufallsgenerator mit Seed (mulberry32): gleicher Seed → gleiches Ergebnis. */
export interface Rng {
  /** Zahl in [0, 1). */
  next(): number;
  /** Ganzzahl in [min, max] (inklusive). */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Neuer, unabhängiger Generator (für Teilaufgaben). */
  fork(salt: number): Rng;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() auf leerer Liste');
      return items[Math.floor(next() * items.length)];
    },
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    fork: (salt) => createRng(hashNumbers(seed, salt)),
  };
  return rng;
}

/** Einfacher, stabiler Hash aus Zahlen. */
export function hashNumbers(...values: number[]): number {
  let h = 2166136261 >>> 0;
  for (const v of values) {
    h ^= v >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** Stabiler Hash eines Textes (FNV-1a). */
export function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
