import { getPart } from './parts/catalog';
import { analyze, columnStacks } from './validate';
import type { Placement } from './types';

/**
 * Bau-Reihenfolge: erst nach Höhe, dann hinten → vorne, links → rechts, Deko möglichst zuletzt.
 * Garantiert: Jedes Teil steht auf schon gebauten Teilen und kein schon gebautes Teil
 * versperrt den Weg von oben.
 */
export function buildOrder(placements: readonly Placement[]): number[] {
  const n = placements.length;
  const before: Set<number>[] = placements.map(() => new Set<number>());
  const { supports } = analyze(placements, { checkTipping: false });
  supports.forEach((list, i) => list.forEach((j) => before[i].add(j)));
  for (const stack of columnStacks(placements).values()) {
    for (let k = 1; k < stack.length; k++) {
      const lower = stack[k - 1];
      const upper = stack[k];
      if (lower.index !== upper.index) before[upper.index].add(lower.index);
    }
  }

  const isDeco = placements.map((p) => (getPart(p.part).kind === 'deco' && !getPart(p.part).groundOnly ? 1 : 0));
  const key = (i: number): number[] => [isDeco[i], placements[i].y, placements[i].z, placements[i].x, i];
  const less = (a: number[], b: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] < b[k];
    return false;
  };

  const remaining = before.map((s) => s.size);
  const after: number[][] = placements.map(() => []);
  before.forEach((s, i) => s.forEach((j) => after[j].push(i)));
  const done = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  for (let step = 0; step < n; step++) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (done[i] || remaining[i] > 0) continue;
      if (best < 0 || less(key(i), key(best))) best = i;
    }
    if (best < 0) {
      // Zyklus (sollte bei gültigen Bauwerken nicht vorkommen): Rest einfach nach Höhe.
      const rest = placements.map((_, i) => i).filter((i) => !done[i]);
      rest.sort((a, b) => (less(key(a), key(b)) ? -1 : 1));
      order.push(...rest);
      break;
    }
    done[best] = true;
    order.push(best);
    for (const j of after[best]) remaining[j]--;
  }
  return order;
}

/** Schritte: ein Teil pro Schritt oder eine ganze Schicht (gleiche Höhe) pro Schritt. */
export function groupSteps(
  placements: readonly Placement[],
  order: readonly number[],
  mode: 'single' | 'layer',
): number[][] {
  if (mode === 'single') return order.map((i) => [i]);
  const steps: number[][] = [];
  let lastY = Number.NaN;
  for (const i of order) {
    const y = placements[i].y;
    if (steps.length && y === lastY) steps[steps.length - 1].push(i);
    else steps.push([i]);
    lastY = y;
  }
  return steps;
}

/** Prüft, ob eine Reihenfolge baubar ist (für Tests). */
export function isBuildableOrder(placements: readonly Placement[], order: readonly number[]): boolean {
  if (new Set(order).size !== placements.length || order.length !== placements.length) return false;
  const pos = new Map<number, number>();
  order.forEach((idx, k) => pos.set(idx, k));
  const { supports } = analyze(placements, { checkTipping: false });
  for (let i = 0; i < placements.length; i++) {
    for (const j of supports[i]) if (pos.get(j)! > pos.get(i)!) return false;
  }
  for (const stack of columnStacks(placements).values()) {
    for (let k = 1; k < stack.length; k++) {
      const lower = stack[k - 1].index;
      const upper = stack[k].index;
      if (lower !== upper && pos.get(lower)! > pos.get(upper)!) return false;
    }
  }
  return true;
}
