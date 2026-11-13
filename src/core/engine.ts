import { canBuild, totalParts, type Counts } from './inventory';
import { solveColors } from './colorSolver';
import { boundsOf, centerPlacements } from './grid';
import { ShapeBudget } from './recipes/builder';
import { RECIPES } from './recipes';
import type { Recipe, RecipeContext } from './recipes/types';
import { createRng, hashNumbers, hashString, type Rng } from './rng';
import { buildOrder } from './steps';
import { splitRole } from './substitute';
import type { Category, Creation, Placement, RoleDef } from './types';
import { isValid } from './validate';

export interface IdeaRequest {
  counts: Counts;
  /** Gewünschte Anzahl Teile. */
  target: number;
  seed: number;
  baseplate?: boolean;
  allowSwap?: boolean;
  category?: Category | 'alle';
  /** Schon gebaute Bauplan-IDs (für Abwechslung). */
  history?: readonly string[];
  /** Wie oft welche Kategorie gewählt wurde (Lieblinge zuerst). */
  favorites?: Partial<Record<Category, number>>;
  /** Anzahl Ideen (Standard 6). */
  count?: number;
  recipes?: readonly Recipe[];
}

export function sizeTolerance(target: number): number {
  return Math.max(3, Math.round(target * 0.3));
}

/** Versucht, aus einem Bauplan ein baubares Bauwerk zu machen. */
export function createFromRecipe(recipe: Recipe, req: IdeaRequest, seed: number): Creation | null {
  const baseplate = !!req.baseplate;
  for (let attempt = 0; attempt < 4; attempt++) {
    const rng = createRng(hashNumbers(seed, hashString(recipe.id), attempt));
    const ctx: RecipeContext = {
      target: Math.max(1, Math.round(req.target)),
      rng,
      budget: ShapeBudget.fromCounts(req.counts),
      counts: req.counts,
      baseplate,
    };
    if (recipe.when && !recipe.when(ctx)) return null;
    let draft;
    try {
      draft = recipe.generate(ctx);
    } catch (e) {
      if (import.meta.env?.DEV) console.warn(`Bauplan ${recipe.id} fehlgeschlagen`, e);
      draft = null;
    }
    if (!draft || draft.placements.length === 0) continue;
    if (!draft.anySize && Math.abs(draft.placements.length - ctx.target) > sizeTolerance(ctx.target)) continue;
    const placed = centerPlacements(draft.placements);
    if (!isValid(placed, { baseplate })) continue;
    const colored = colorize(placed, draft.roles, req, rng, baseplate);
    if (!colored) continue;
    // Durch Zerlegen können Teile dazukommen – Größe nochmal prüfen.
    if (!draft.anySize && Math.abs(colored.length - ctx.target) > sizeTolerance(ctx.target)) continue;
    const order = buildOrder(colored);
    const b = boundsOf(colored);
    return {
      id: `${recipe.id}-${seed}-${ctx.target}-${attempt}`,
      recipeId: recipe.id,
      name: draft.name ?? rng.pick(recipe.names),
      category: recipe.category,
      emoji: recipe.emoji,
      seed,
      target: ctx.target,
      placements: colored,
      order,
      partCount: colored.length,
      height: b.maxY,
      tips: draft.tips ?? [],
    };
  }
  return null;
}

/** Farben vergeben – notfalls große Steine zerlegen oder Rollen bunt machen. */
function colorize(
  placements: Placement[],
  roles: RoleDef[],
  req: IdeaRequest,
  rng: Rng,
  baseplate: boolean,
): Placement[] | null {
  let current = placements;
  let currentRoles = roles.slice();
  const splitTried = new Set<string>();
  for (let round = 0; round < 8; round++) {
    const res = solveColors(current, currentRoles, req.counts, { allowSwap: req.allowSwap !== false, rng });
    if (res.ok) return canBuild(req.counts, res.placements) ? res.placements : null;
    const failed = res.failedRole;
    if (!failed) return null;
    if (!splitTried.has(failed)) {
      splitTried.add(failed);
      const split = splitRole(current, failed);
      if (split.length !== current.length && isValid(split, { baseplate })) {
        current = split;
        continue;
      }
    }
    const def = currentRoles.find((r) => r.id === failed);
    if (def?.mixed) return null;
    currentRoles = currentRoles.filter((r) => r.id !== failed).concat({ ...(def ?? { id: failed }), mixed: true });
  }
  return null;
}

/** Erzeugt mehrere passende Ideen, die besten zuerst. */
export function generateIdeas(req: IdeaRequest): Creation[] {
  const recipes = (req.recipes ?? RECIPES).filter(
    (r) => !req.category || req.category === 'alle' || r.category === req.category,
  );
  const want = req.count ?? 6;
  const rng = createRng(req.seed);
  const history = new Set(req.history ?? []);
  const favTotal = Object.values(req.favorites ?? {}).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const scored: { c: Creation; score: number }[] = [];
  const seen = new Set<string>();
  for (const round of [0, 1]) {
    for (const recipe of recipes) {
      if (round === 1 && scored.length >= want) break;
      if (recipe.min > req.target + sizeTolerance(req.target) && recipe.id !== 'megaturm') continue;
      const c = createFromRecipe(recipe, req, hashNumbers(req.seed, hashString(recipe.id), round));
      if (!c) continue;
      const sig = `${c.recipeId}:${c.partCount}:${c.placements
        .slice(0, 8)
        .map((p) => p.color)
        .join('')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const fit = 1 - Math.min(1, Math.abs(c.partCount - req.target) / Math.max(1, req.target));
      const fav = ((req.favorites?.[c.category] ?? 0) / favTotal) * 1.5;
      const fresh = history.has(c.recipeId) ? 0 : 0.6;
      const repeat = round === 1 ? -0.8 : 0;
      scored.push({ c, score: fit * 2 + fav + fresh + repeat + rng.next() * 0.8 });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, want).map((s) => s.c);
}

/** Eine zufällige Überraschung in der gewünschten Größe. */
export function surprise(req: IdeaRequest): Creation | null {
  const ideas = generateIdeas({ ...req, count: 4 });
  if (ideas.length === 0) return null;
  return createRng(req.seed ^ 0x5bd1e995).pick(ideas);
}

/** Größter sinnvoller Wert für den Größen-Regler. */
export function maxTarget(counts: Counts): number {
  return Math.max(3, totalParts(counts));
}
