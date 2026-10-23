import type { Recipe } from './types';
import { formatMinutes, isPlaceholderTiming, parseDurationMinutes } from './duration';

/** "Serves 12 · Prep 20 min · Cook 1 h 15 · Medium", leaving out what isn't known. */
export function factsLine(recipe: Pick<Recipe, 'prepTime' | 'cookTime' | 'difficulty'> & { servings?: number | null }): string {
  const parts: string[] = [];
  if (recipe.servings) parts.push(`Serves ${recipe.servings}`);
  if (!isPlaceholderTiming(recipe)) {
    const prep = parseDurationMinutes(recipe.prepTime);
    const cook = parseDurationMinutes(recipe.cookTime);
    if (prep) parts.push(`Prep ${formatMinutes(prep)}`);
    if (cook) parts.push(`Cook ${formatMinutes(cook)}`);
  }
  if (recipe.difficulty) parts.push(recipe.difficulty);
  return parts.join(' · ');
}

/** The servings a recipe is written for; a recipe that never said is taken as 4. */
export function baseServings(recipe: { servings?: number | null }): number {
  return recipe.servings && recipe.servings > 0 ? recipe.servings : 4;
}
