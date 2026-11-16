import { describe, expect, it } from 'vitest';
import { MAX_STACK, TRICK_PHRASES, TickleCounter, nextTrick, pick, toppleAt, type Trick } from './brain';

/** Reproduzierbarer Zufall für Tests. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('Noppis Verhalten', () => {
  it('macht nie zweimal dasselbe Kunststück hintereinander und nutzt alle', () => {
    const rnd = seeded(7);
    let prev: Trick | null = null;
    const seen = new Set<Trick>();
    for (let i = 0; i < 300; i++) {
      const t = nextTrick(prev, 0, rnd);
      expect(t).not.toBe(prev);
      seen.add(t);
      prev = t;
    }
    expect([...seen].sort()).toEqual(Object.keys(TRICK_PHRASES).sort());
  });

  it('mit Steinen auf dem Kopf keine Saltos, Pirouetten oder Tänze', () => {
    const rnd = seeded(3);
    for (let i = 0; i < 200; i++) expect(['flip', 'spin', 'dance']).not.toContain(nextTrick(null, 2, rnd));
  });

  it('der Turm auf dem Kopf fällt bei 4 bis 7 Steinen um – nie später als erlaubt', () => {
    const rnd = seeded(11);
    for (let i = 0; i < 200; i++) {
      const n = toppleAt(rnd);
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(MAX_STACK);
    }
    expect(toppleAt(() => 0)).toBe(4);
    expect(toppleAt(() => 0.9999)).toBe(7);
  });

  it('erkennt Kitzeln an schnellen Antippern', () => {
    const tickle = new TickleCounter(4, 1600);
    expect([0, 300, 600].map((t) => tickle.tap(t))).toEqual([false, false, false]);
    expect(tickle.tap(900)).toBe(true);
    // danach geht es von vorne los
    expect(tickle.tap(1000)).toBe(false);
    // langsame Antipper sind kein Kitzeln
    const slow = new TickleCounter(4, 1600);
    expect([0, 1000, 2000, 3000, 4000].some((t) => slow.tap(t))).toBe(false);
  });

  it('pick bleibt auch bei Zufall = 1 im Bereich', () => {
    expect(pick(['a', 'b'], () => 0.999999)).toBe('b');
    expect(pick(['a', 'b'], () => 1)).toBe('b');
  });
});
