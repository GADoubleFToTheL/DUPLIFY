import { dino, dog, duck, giraffe, snake } from './animals';
import { bridge, castle, pyramid, robot, sculpture, stairs } from './fantasy';
import { garden, playground } from './garden';
import { house, skyscraper } from './houses';
import { megaTower, tower } from './towers';
import type { Recipe } from './types';
import { car, rocket, train } from './vehicles';
import { wall } from './walls';

export const RECIPES: readonly Recipe[] = [
  tower,
  megaTower,
  skyscraper,
  house,
  castle,
  duck,
  dog,
  giraffe,
  snake,
  dino,
  car,
  train,
  rocket,
  robot,
  bridge,
  stairs,
  pyramid,
  wall,
  garden,
  playground,
  sculpture,
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
