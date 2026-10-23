/*
 * Amounts as a cook writes them (changes 70, 71, 113).
 *
 * "0.13 tsp" and "0.51 fl oz" are what a unit converter leaves behind; a
 * cookbook says "⅛ tsp" and "1 tbsp". Spoons, cups and counts print as kitchen
 * fractions. Metric weights and volumes print as whole numbers, because nobody
 * weighs ⅓ of a gram. A measure too small for its unit moves to the smaller
 * one: under a quarter cup is tablespoons, under a tablespoon of fluid ounces
 * is spoons. A weight written into an ingredient's name, "(170g)", comes out of
 * the name into a column of its own.
 */

const GLYPHS: [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

/** How close a decimal must be to a fraction to print as one. */
const TOLERANCE = 0.03;

/** 1.5 → "1½", 0.333 → "⅓", 0.13 → "⅛", 2 → "2", 1.23 → "1.23" when no fraction is near. */
export function kitchenFraction(value: number): string {
  if (!Number.isFinite(value)) return '';
  const whole = Math.floor(value + TOLERANCE);
  const rest = value - whole;
  if (rest < TOLERANCE) return String(whole);
  const glyph = GLYPHS.find(([fraction]) => Math.abs(rest - fraction) <= TOLERANCE);
  if (glyph) return whole > 0 ? `${whole}${glyph[1]}` : glyph[1];
  return String(Number(value.toFixed(2)));
}

const METRIC = /^(g|grams?|kg|kilograms?|mg|ml|millilit(er|re)s?|l|lit(er|re)s?|cl|dl)$/i;
// A lone "t" is a teaspoon and a lone "T" a tablespoon, so case matters there and nowhere else.
const isTsp = (u: string) => u === 't' || /^(tsp|teaspoons?)$/i.test(u);
const isTbsp = (u: string) => u === 'T' || /^(tbsp|tablespoons?|tbs)$/i.test(u);
const CUP = /^(cups?|c)$/i;
const FLOZ = /^(fl\.? ?oz|fluid ounces?)$/i;

export interface FriendlyAmount {
  /** The figure as printed: "1½", "⅛", "170". Empty when there is no amount. */
  quantity: string;
  unit: string;
}

/** An amount ready to print, after any change of unit a cook would make. */
export function friendlyAmount(quantity: number | null | undefined, unit: string | null | undefined, scale = 1): FriendlyAmount {
  const u = (unit ?? '').trim();
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return { quantity: '', unit: '' };
  let q = quantity * scale;
  let printedUnit = u;

  if (METRIC.test(u)) {
    const rounded = q >= 10 ? Math.round(q) : Number(q.toFixed(1));
    return { quantity: String(rounded), unit: u };
  }
  if (FLOZ.test(u) && q < 1) {
    q *= 2;
    printedUnit = 'tbsp';
  }
  if (CUP.test(printedUnit) && q < 0.25 - TOLERANCE) {
    q *= 16;
    printedUnit = 'tbsp';
  }
  if (isTbsp(printedUnit) && q < 0.5 - TOLERANCE) {
    q *= 3;
    printedUnit = 'tsp';
  }
  if (isTsp(printedUnit) && q < 1 / 8 - TOLERANCE) {
    return { quantity: '', unit: 'a pinch' };
  }
  // A fluid measure that rounds to a whole spoon reads as one.
  if (isTbsp(printedUnit) && Math.abs(q - Math.round(q)) < 0.05) q = Math.round(q);
  return { quantity: kitchenFraction(q), unit: printedUnit };
}

/** "1½ cups", "170 g", "a pinch", or '' when there is no amount. */
export function friendlyAmountText(quantity: number | null | undefined, unit: string | null | undefined, scale = 1): string {
  const a = friendlyAmount(quantity, unit, scale);
  return [a.quantity, a.unit].filter(Boolean).join(' ');
}

const NAME_WEIGHT = /\s*\(\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\s*\)/i;

export interface IngredientParts {
  /** The ingredient itself: "cream cheese". */
  name: string;
  /** What follows its first comma: "softened". */
  note: string;
  /** A weight written into the name, as its own column: "170 g". */
  weight: string;
}

/** Splits an ingredient line's name into the name, its note and any weight it carried. */
export function ingredientParts(raw: string, scale = 1): IngredientParts {
  let text = raw;
  let weight = '';
  const match = text.match(NAME_WEIGHT);
  if (match) {
    const grams = parseFloat(match[1].replace(',', '.'));
    weight = friendlyAmountText(grams, match[2].toLowerCase(), scale);
    text = text.replace(NAME_WEIGHT, '');
  }
  const comma = text.indexOf(',');
  const name = (comma === -1 ? text : text.slice(0, comma)).trim();
  const note = comma === -1 ? '' : text.slice(comma + 1).trim();
  return { name, note, weight };
}
