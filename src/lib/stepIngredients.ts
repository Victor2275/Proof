/*
 * Which ingredients a step uses.
 *
 * Baking Mode prints "This step needs" under each step, and the Bluetooth scale
 * auto-advances when the weight of those ingredients is on it. Both are only
 * worth having if the list is right, and the old matcher was not: any word of
 * an ingredient's name found anywhere in the step counted, as a substring — so
 * "All purpose flour" matched "Allow the bread to cool", and "Rye Flour" matched
 * "boil the rye grain" on the strength of "rye" alone.
 *
 * Now a step uses an ingredient when every distinguishing word of its name
 * appears in the step as a whole word. Preparation words ("fresh", "chopped",
 * "extra virgin") are not distinguishing — the step says "olive oil", not the
 * label on the bottle. When nothing qualifies the panel shows nothing: an empty
 * list is honest, a guessed one sends a baker for the wrong bag.
 */

import { gramsOf } from './bakersMath';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

// Words that describe how an ingredient is bought or prepared rather than what
// it is. Leaving them out lets "2 cloves garlic, minced" match "add the garlic".
const DESCRIPTORS = new Set([
  'fresh', 'freshly', 'dried', 'ground', 'whole', 'large', 'small', 'medium', 'extra', 'virgin',
  'chopped', 'minced', 'diced', 'sliced', 'grated', 'crushed', 'beaten', 'softened', 'melted',
  'room', 'temperature', 'warm', 'cold', 'lukewarm', 'fine', 'finely', 'coarse', 'coarsely',
  'sifted', 'unsalted', 'salted', 'kosher', 'sea', 'optional', 'plus', 'more', 'for', 'and',
  'the', 'of', 'to', 'taste', 'about', 'cut', 'into', 'pieces', 'piece', 'juice', 'zest',
]);

/** Folds plurals so "eggs" meets "egg" and "potatoes" meets "potato". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(stem);
}

/** The words that say what an ingredient is, with its preparation left off. */
function distinguishing(name: string): string[] {
  // "Garlic, minced" and "Butter (softened)" are named before the comma or bracket.
  const core = name.split(/[,(]/)[0];
  return words(core).filter((w) => w.length > 1 && !DESCRIPTORS.has(w));
}

export function ingredientsForStep<T extends Ingredient>(stepText: string, ingredients: T[]): T[] {
  const inStep = new Set(words(stepText));
  return ingredients.filter((ing) => {
    const needed = distinguishing(ing.name ?? '');
    return needed.length > 0 && needed.every((w) => inStep.has(w));
  });
}

/**
 * The weight the scale should reach for a step, in grams — or null when any
 * ingredient the step uses is not weighed. The old target summed quantities in
 * whatever unit they came in ("assume grams"), so a step needing 280 g of grain
 * and 2.5 cups of flour asked the scale for 282.5 g and auto-advanced on it.
 */
export function scaleTargetGrams(ingredients: { name?: string; quantity?: number; unit?: string }[]): number | null {
  if (ingredients.length === 0) return null;
  let total = 0;
  for (const ing of ingredients) {
    const grams = gramsOf(ing);
    if (grams === null) return null;
    total += grams;
  }
  return Math.round(total);
}
