import type { Counts } from '../inventory';
import type { Rng } from '../rng';
import type { Category, Placement, RoleDef } from '../types';
import type { ShapeBudget } from './builder';

export interface RecipeContext {
  /** Gewünschte Anzahl Teile. */
  target: number;
  rng: Rng;
  budget: ShapeBudget;
  counts: Counts;
  baseplate: boolean;
}

export interface Draft {
  placements: Placement[];
  roles: RoleDef[];
  name?: string;
  tips?: string[];
  /** Größe nicht gegen das Ziel prüfen (z. B. Mega-Turm aus allen Steinen). */
  anySize?: boolean;
}

export interface Recipe {
  id: string;
  category: Category;
  emoji: string;
  names: readonly string[];
  /** Kleinste sinnvolle Teilezahl. */
  min: number;
  /** Optional: nur anbieten, wenn die Bedingung erfüllt ist. */
  when?: (ctx: RecipeContext) => boolean;
  generate(ctx: RecipeContext): Draft | null;
}
