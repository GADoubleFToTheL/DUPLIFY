import { house, skyscraper } from './houses';
import { megaTower, tower } from './towers';
import type { Recipe } from './types';
import { wall } from './walls';

export const RECIPES: readonly Recipe[] = [tower, megaTower, skyscraper, house, wall];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
