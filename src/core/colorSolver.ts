import { COLOR_IDS, RAINBOW } from './colors';
import { parseVariantKey, shapeKey, type Counts } from './inventory';
import { getPart } from './parts/catalog';
import { createRng, type Rng } from './rng';
import type { ColorId, Placement, RoleDef } from './types';

export interface SolveOptions {
  /** Farben dürfen von den Lieblingsfarben abweichen (Standard: ja). */
  allowSwap?: boolean;
  rng?: Rng;
  /** Wahrscheinlichkeit, einen übrigen Bildstein als Überraschung einzubauen. */
  pictureChance?: number;
}

export type SolveResult = { ok: true; placements: Placement[] } | { ok: false; failedRole: string | null };

const NONE = '-';

/** Verteilt echte Farben aus dem Bestand auf die Farbrollen eines Bauplans. */
export function solveColors(
  placements: readonly Placement[],
  roles: readonly RoleDef[],
  counts: Counts,
  opts: SolveOptions = {},
): SolveResult {
  const rng = opts.rng ?? createRng(1);
  const allowSwap = opts.allowSwap !== false;

  // Vorrat je Bauform und Farbe (Bildsteine zählen als normale Steine).
  const pool = new Map<string, Map<string, number>>();
  const plain = new Map<string, number>();
  for (const [key, n] of Object.entries(counts)) {
    if (!(n > 0)) continue;
    const { part, color, print } = parseVariantKey(key);
    const s = shapeKey(part, print);
    let m = pool.get(s);
    if (!m) pool.set(s, (m = new Map()));
    const ck = color ?? NONE;
    m.set(ck, (m.get(ck) ?? 0) + n);
    if (!print) plain.set(`${part}|${ck}`, (plain.get(`${part}|${ck}`) ?? 0) + n);
  }
  const avail = (shape: string, color: string) => pool.get(shape)?.get(color) ?? 0;
  const take = (shape: string, color: string, n: number) => {
    const m = pool.get(shape);
    if (m) m.set(color, (m.get(color) ?? 0) - n);
  };

  const out: Placement[] = placements.map((p) => ({ ...p }));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  // 1) Teile ohne Farbwahl
  const noColor = new Map<string, number>();
  out.forEach((p) => {
    if (!getPart(p.part).colorable) {
      p.color = null;
      const s = shapeKey(p.part, p.print);
      noColor.set(s, (noColor.get(s) ?? 0) + 1);
    }
  });
  for (const [s, n] of noColor) {
    if (avail(s, NONE) < n) return { ok: false, failedRole: null };
    take(s, NONE, n);
  }

  // 2) Rollen sammeln
  const byRole = new Map<string, number[]>();
  out.forEach((p, i) => {
    if (!getPart(p.part).colorable) return;
    const r = p.role ?? '_bunt';
    let list = byRole.get(r);
    if (!list) byRole.set(r, (list = []));
    list.push(i);
  });
  const roleDef = (id: string): RoleDef => roleMap.get(id) ?? { id, mixed: true };

  const fixedRoles = [...byRole.keys()].filter((r) => !roleDef(r).mixed);
  const mixedRoles = [...byRole.keys()].filter((r) => roleDef(r).mixed);
  const demand = new Map<string, Map<string, number>>();
  for (const r of byRole.keys()) {
    const d = new Map<string, number>();
    for (const i of byRole.get(r)!) {
      const s = shapeKey(out[i].part, out[i].print);
      d.set(s, (d.get(s) ?? 0) + 1);
    }
    demand.set(r, d);
  }
  const total = (r: string) => [...demand.get(r)!.values()].reduce((a, b) => a + b, 0);
  fixedRoles.sort((a, b) => total(b) - total(a));

  // 3) Backtracking für einfarbige Rollen
  const assigned = new Map<string, ColorId>();
  const jitter = new Map<ColorId, number>(COLOR_IDS.map((c) => [c, rng.next()]));
  let visits = 0;
  let deepest = -1;
  let deepestRole: string | null = null;

  const candidates = (r: string): ColorId[] => {
    const def = roleDef(r);
    const d = demand.get(r)!;
    const prefer = def.prefer ?? [];
    let colors = COLOR_IDS.filter((c) => [...d].every(([s, n]) => avail(s, c) >= n));
    if (!allowSwap && prefer.length) colors = colors.filter((c) => prefer.includes(c));
    const usedColors = new Set(assigned.values());
    const score = (c: ColorId) => {
      const pi = prefer.indexOf(c);
      let sc = pi >= 0 ? pi : 20 + jitter.get(c)! * 6;
      if (def.differentFrom?.some((o) => assigned.get(o) === c)) sc += 40;
      for (const [other, oc] of assigned) {
        if (oc === c && roleDef(other).differentFrom?.includes(r)) sc += 40;
      }
      if (usedColors.has(c)) sc += 2;
      return sc;
    };
    return colors.sort((a, b) => score(a) - score(b)).slice(0, 8);
  };

  const solve = (k: number): boolean => {
    if (k === fixedRoles.length) return true;
    if (++visits > 6000) return false;
    const r = fixedRoles[k];
    const cands = candidates(r);
    if (cands.length === 0 && k > deepest) {
      deepest = k;
      deepestRole = r;
    }
    for (const c of cands) {
      const d = demand.get(r)!;
      for (const [s, n] of d) take(s, c, n);
      assigned.set(r, c);
      if (solve(k + 1)) return true;
      assigned.delete(r);
      for (const [s, n] of d) take(s, c, -n);
    }
    return false;
  };
  if (!solve(0)) return { ok: false, failedRole: deepestRole ?? fixedRoles[0] ?? null };
  for (const r of fixedRoles) for (const i of byRole.get(r)!) out[i].color = assigned.get(r)!;

  // 4) Bunte Rollen: Ebene für Ebene, möglichst nach Wunsch-Farbfolge
  for (const r of mixedRoles) {
    const def = roleDef(r);
    const offset = rng.int(0, RAINBOW.length - 1);
    const seq: ColorId[] = def.sequence ?? def.prefer ?? RAINBOW.map((_, i) => RAINBOW[(i + offset) % RAINBOW.length]);
    const idx = byRole.get(r)!.slice().sort((a, b) => out[a].y - out[b].y || out[a].x - out[b].x || out[a].z - out[b].z);
    const levels: number[][] = [];
    for (const i of idx) {
      const last = levels[levels.length - 1];
      if (last && out[last[0]].y === out[i].y) last.push(i);
      else levels.push([i]);
    }
    let prev: ColorId | null = null;
    for (let li = 0; li < levels.length; li++) {
      const level = levels[li];
      const d = new Map<string, number>();
      for (const i of level) {
        const s = shapeKey(out[i].part, out[i].print);
        d.set(s, (d.get(s) ?? 0) + 1);
      }
      const desired = seq[li % seq.length];
      const order: ColorId[] = [];
      const pushU = (c: ColorId) => {
        if (!order.includes(c)) order.push(c);
      };
      pushU(desired);
      for (let k = 1; k < seq.length; k++) pushU(seq[(li + k) % seq.length]);
      if (allowSwap || !def.prefer) {
        COLOR_IDS.slice()
          .sort((a, b) => sumAvail(b) - sumAvail(a) || jitter.get(a)! - jitter.get(b)!)
          .forEach(pushU);
      }
      function sumAvail(c: ColorId) {
        let n = 0;
        for (const s of d.keys()) n += avail(s, c);
        return n;
      }
      const fits = (c: ColorId) => [...d].every(([s, n]) => avail(s, c) >= n);
      let color = order.find((c) => c !== prev && fits(c)) ?? order.find((c) => fits(c));
      if (color) {
        for (const [s, n] of d) take(s, color, n);
        for (const i of level) out[i].color = color;
        prev = color;
        continue;
      }
      // Ebene passt nicht in eine Farbe: Teil für Teil
      for (const i of level) {
        const s = shapeKey(out[i].part, out[i].print);
        color = order.find((c) => c !== prev && avail(s, c) > 0) ?? order.find((c) => avail(s, c) > 0);
        if (!color) return { ok: false, failedRole: r };
        take(s, color, 1);
        out[i].color = color;
        prev = color;
      }
    }
  }

  // 5) Bildsteine: wo normale Steine nicht reichen – und manchmal als kleine Überraschung
  const used = new Map<string, number[]>();
  out.forEach((p, i) => {
    if (p.print || !p.color || !getPart(p.part).prints?.includes('picture')) return;
    const k = `${p.part}|${p.color}`;
    let list = used.get(k);
    if (!list) used.set(k, (list = []));
    list.push(i);
  });
  for (const [k, list] of used) {
    const plainN = plain.get(k) ?? 0;
    const [part, color] = k.split('|');
    const pictureN = counts[`${part}|${color}|picture`] ?? 0;
    let need = Math.max(0, list.length - plainN);
    if (need < pictureN && rng.chance(opts.pictureChance ?? 0.5)) need++;
    need = Math.min(need, pictureN, list.length);
    for (const i of rng.shuffle(list).slice(0, need)) out[i].print = 'picture';
  }

  return { ok: true, placements: out };
}
