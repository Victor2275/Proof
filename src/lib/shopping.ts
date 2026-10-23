import Fuse from 'fuse.js';
import type { PantryItem, Recipe, ShoppingItem } from './types';
import { byAisle } from './aisles';
import { friendlyAmountText, ingredientParts } from './quantities';
import { cleanText } from './recipeText';

/* The Shop's "To buy" list: what goes on it from a recipe, and how it reads as text. */

/** What a recipe still needs: not in the cupboard, not already waiting on the list. */
export function stillNeeded(recipe: Recipe, pantry: PantryItem[], list: ShoppingItem[]) {
  const fuse = pantry.length ? new Fuse(pantry, { keys: ['name'], threshold: 0.35 }) : null;
  const waiting = new Set(list.filter((s) => !s.checked).map((s) => s.name.toLowerCase()));
  return recipe.ingredients
    .map((ing) => ({ ing, name: ingredientParts(cleanText(ing.name)).name }))
    .filter(({ name }) => name && !waiting.has(name.toLowerCase()) && !fuse?.search(name).length)
    .map(({ ing, name }) => ({ name, quantity: ing.quantity, unit: ing.unit, recipeId: recipe._id, recipeTitle: recipe.title }));
}

/** The list as it reads pasted into a message: aisle headings, one thing a line. */
export function listAsText(items: ShoppingItem[]): string {
  return byAisle(items.filter((i) => !i.checked))
    .map((g) => [g.label, ...g.items.map((i) => `- ${[friendlyAmountText(i.quantity, i.unit), i.name].filter(Boolean).join(' ')}`)].join('\n'))
    .join('\n\n');
}
