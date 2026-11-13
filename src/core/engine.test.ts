import { describe, expect, it } from 'vitest';
import { createFromRecipe, generateIdeas, sizeTolerance } from './engine';
import { canBuild, sampleCounts, uniformCounts, variantKey, type Counts } from './inventory';
import { RECIPES } from './recipes';
import { isBuildableOrder } from './steps';
import { isValid } from './validate';
import type { Creation } from './types';

const INVENTORIES: Record<string, Counts> = {
  winzig: { [variantKey('brick-2x2', 'rot')]: 3, [variantKey('brick-2x4', 'blau')]: 2 },
  nurSteine: uniformCounts(['brick-2x2', 'brick-2x4'], 3, ['rot', 'gelb', 'blau', 'gruen']),
  typisch: sampleCounts(),
  riesig: uniformCounts(
    ['brick-2x2', 'brick-2x4', 'brick-2x6', 'slope-2x2', 'tall-2x2', 'door', 'window', 'flower', 'figure', 'arch-2x4'],
    8,
  ),
  einfarbig: { [variantKey('brick-2x4', 'rot')]: 40, [variantKey('brick-2x2', 'rot')]: 30 },
};

function check(c: Creation, counts: Counts, baseplate = false) {
  expect(isValid(c.placements, { baseplate })).toBe(true);
  expect(isBuildableOrder(c.placements, c.order)).toBe(true);
  expect(canBuild(counts, c.placements)).toBe(true);
  expect(c.placements.every((p) => p.color !== undefined)).toBe(true);
}

describe('Engine', () => {
  it('jedes Ergebnis ist gültig, baubar, im Bestand und (meist) in der Zielgröße', () => {
    let made = 0;
    for (const [, counts] of Object.entries(INVENTORIES)) {
      for (const target of [4, 8, 15, 30, 60]) {
        for (let seed = 1; seed <= 8; seed++) {
          for (const recipe of RECIPES) {
            const c = createFromRecipe(recipe, { counts, target, seed }, seed * 7919);
            if (!c) continue;
            made++;
            check(c, counts);
            if (recipe.id !== 'megaturm') {
              expect(Math.abs(c.partCount - target)).toBeLessThanOrEqual(sizeTolerance(target));
            }
          }
        }
      }
    }
    expect(made).toBeGreaterThan(200);
  }, 60_000);

  it('gleicher Seed → gleiches Bauwerk', () => {
    const counts = sampleCounts();
    const a = generateIdeas({ counts, target: 20, seed: 42 });
    const b = generateIdeas({ counts, target: 20, seed: 42 });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a[0].placements).toEqual(b[0].placements);
  });

  it('liefert für die Beispiel-Kiste mehrere Ideen in jeder Größe', () => {
    const counts = sampleCounts();
    for (const target of [5, 12, 25, 50]) {
      const ideas = generateIdeas({ counts, target, seed: target });
      expect(ideas.length).toBeGreaterThanOrEqual(2);
      ideas.forEach((c) => check(c, counts));
    }
  });

  it('Mega-Turm erscheint am oberen Ende und verbaut viele Steine', () => {
    const counts = sampleCounts();
    const ideas = generateIdeas({ counts, target: 200, seed: 3, count: 10 });
    const mega = ideas.find((c) => c.recipeId === 'megaturm');
    expect(mega).toBeDefined();
    expect(mega!.partCount).toBeGreaterThan(80);
    check(mega!, counts);
  });

  it('Hochhaus hat Tür und Dach, wenn die Teile da sind', () => {
    const counts = INVENTORIES.riesig;
    const sky = RECIPES.find((r) => r.id === 'hochhaus')!;
    const c = createFromRecipe(sky, { counts, target: 60, seed: 1 }, 99)!;
    expect(c).not.toBeNull();
    expect(c.placements.some((p) => p.part === 'door')).toBe(true);
    expect(c.placements.some((p) => p.part === 'window')).toBe(true);
    expect(c.placements.some((p) => p.part === 'slope-2x2')).toBe(true);
  });

  it('ohne Steine gibt es keine Ideen', () => {
    expect(generateIdeas({ counts: {}, target: 10, seed: 1 })).toEqual([]);
  });
});
