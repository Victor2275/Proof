/*
 * Baker's percentages.
 *
 * Every ingredient as a percentage of the total flour, by weight. The "by
 * weight" is the whole definition: the old reading summed quantities in
 * whatever unit they came in, so a recipe with 0.75 cup plus 2.5 cup of flour
 * had 3.25 "units" of flour, and 200 g of rye grain read as 6153.8%. A number
 * built from cups and grams together is not a reading; it is noise in the
 * shape of one.
 *
 * So weights are converted to grams, and only weights count. Millilitres stand
 * in for grams for water alone — the one liquid where a millilitre is a gram,
 * and the one a hydration figure is about. When any flour is not weighed, the
 * recipe has no baker's percentages, and the reason is reported instead.
 */

interface Ingredient {
  name?: string;
  quantity?: number;
  unit?: string;
}

const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1, gr: 1, gram: 1, grams: 1,
  kg: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

const MILLILITRES_PER_UNIT: Record<string, number> = {
  ml: 1, millilitre: 1, millilitres: 1, milliliter: 1, milliliters: 1,
  l: 1000, litre: 1000, litres: 1000, liter: 1000, liters: 1000,
};

const isFlour = (name: string) => /\bflour\b/i.test(name);
const isWater = (name: string) => /\bwater\b/i.test(name);

/** The ingredient's weight in grams, or null when its unit is not a weight. */
export function gramsOf(ingredient: Ingredient): number | null {
  const quantity = ingredient.quantity;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return null;
  const unit = (ingredient.unit ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (unit in GRAMS_PER_UNIT) return quantity * GRAMS_PER_UNIT[unit];
  if (unit in MILLILITRES_PER_UNIT && isWater(ingredient.name ?? '')) {
    return quantity * MILLILITRES_PER_UNIT[unit];
  }
  return null;
}

export type BakersMath =
  | { ok: true; flourGrams: number; percentages: (number | null)[] }
  | { ok: false; reason: 'no-flour' | 'flour-not-weighed'; unweighedUnit?: string };

export function bakersMath(ingredients: Ingredient[]): BakersMath {
  const flours = ingredients.filter((ing) => isFlour(ing.name ?? ''));
  if (flours.length === 0) return { ok: false, reason: 'no-flour' };

  const unweighed = flours.find((ing) => gramsOf(ing) === null);
  if (unweighed) {
    return { ok: false, reason: 'flour-not-weighed', unweighedUnit: unweighed.unit?.trim() || undefined };
  }

  const flourGrams = flours.reduce((sum, ing) => sum + (gramsOf(ing) as number), 0);
  const percentages = ingredients.map((ing) => {
    const grams = gramsOf(ing);
    return grams === null ? null : (grams / flourGrams) * 100;
  });
  return { ok: true, flourGrams, percentages };
}

/** The sentence a panel shows when there are no percentages to draw. */
export function bakersMathUnavailable(result: Extract<BakersMath, { ok: false }>): string {
  if (result.reason === 'no-flour') return "No flour in this recipe, so there is nothing to take baker's percentages of.";
  return result.unweighedUnit
    ? `Baker's percentages need the flour by weight. This recipe measures it in ${result.unweighedUnit}.`
    : "Baker's percentages need the flour by weight, and this recipe does not weigh it.";
}
