// Vulgar-fraction characters recipe sites commonly use (e.g. "⅔ cup") - a
// regex that only recognized ½¼¾ would silently dump the whole ingredient
// line into `name` with placeholder quantity/unit whenever one of these
// showed up.
const VULGAR_FRACTIONS: Record<string, number> = {
  '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
  '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6,
};
const FRACTION_CHARS = Object.keys(VULGAR_FRACTIONS).join('');
const FRACTION_DENOMINATORS: Record<number, number> = {};
for (const [ch, frac] of Object.entries(VULGAR_FRACTIONS)) {
  const den = ch === '⅓' || ch === '⅔' ? 3
    : ch === '⅙' || ch === '⅚' ? 6
    : ch === '⅛' || ch === '⅜' || ch === '⅝' || ch === '⅞' ? 8
    : ch === '⅕' || ch === '⅖' || ch === '⅗' || ch === '⅘' ? 5
    : 4;
  FRACTION_DENOMINATORS[frac] = den;
}

const VALID_UNITS = [
  'cup', 'cups', 'oz', 'ounce', 'ounces', 'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons', 'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'lb', 'lbs', 'pound', 'pounds',
  'pinch', 'pinches', 'dash', 'dashes', 'handful', 'handfuls', 'splash', 'splashes',
  'knob', 'knobs', 'clove', 'cloves', 'sprig', 'sprigs', 'bunch', 'bunches',
  'slice', 'slices', 'stick', 'sticks', 'can', 'cans', 'pint', 'pints', 'quart', 'quarts',
];

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

/** Parses a free-text ingredient line (e.g. "⅔ cup sour cream") into { name, quantity, unit }. */
export function parseIngredient(ing: string): ParsedIngredient {
  let qty = 1; let unit = 'x'; let name = ing;
  const qtyCharClass = `[\\d.\\s/${FRACTION_CHARS}]+`;
  const match = ing.match(new RegExp(`^(${qtyCharClass})\\s*([a-zA-Z]+)?\\s+(.*)`));
  if (match) {
    // Normalize vulgar-fraction characters into " num/den " tokens so the
    // whole-number + fraction summing logic below handles them uniformly.
    const qtyStr = match[1]
      .replace(new RegExp(`[${FRACTION_CHARS}]`, 'g'), (ch) => {
        const frac = VULGAR_FRACTIONS[ch];
        const den = FRACTION_DENOMINATORS[frac];
        return ` ${Math.round(frac * den)}/${den} `;
      })
      .trim().replace(/\s+/g, ' ');

    if (qtyStr.includes(' ') || qtyStr.includes('/')) {
      const parts = qtyStr.split(' ');
      let sum = 0;
      for (const p of parts) {
        if (p.includes('/')) {
          const [num, den] = p.split('/');
          sum += parseFloat(num) / parseFloat(den);
        } else {
          sum += parseFloat(p) || 0;
        }
      }
      qty = sum || 1;
    } else {
      qty = parseFloat(qtyStr) || 1;
    }

    if (match[2] && VALID_UNITS.includes(match[2].toLowerCase())) { unit = match[2].toLowerCase(); name = match[3]; }
    else { unit = 'x'; name = match[2] ? match[2] + ' ' + match[3] : match[3]; }
  }
  return { name: name.trim(), quantity: qty, unit };
}
