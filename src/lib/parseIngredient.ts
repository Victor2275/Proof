import type { Component } from './types';
import { kitchenFraction } from './quantities';

/*
 * Reading amounts and ingredient lines as people type them (changes 113, 118).
 *
 * An amount field takes "1½", "1 1/2", "2/3", "0.5" or "½" and keeps a number;
 * it shows the number back as a kitchen fraction, so "0.6666" is never what an
 * author sees. A pasted block of ingredient lines — "2 cups flour", "½ tsp
 * salt", "3 eggs, beaten" — becomes one row each, split into amount, unit and
 * name. Anything it cannot read stays whole in the name, never dropped.
 */

const VULGAR: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const AMOUNT = /^(\d+(?:[.,]\d+)?)?\s*(?:([½⅓⅔¼¾⅛⅜⅝⅞])|(\d+)\s*\/\s*(\d+))?/;

/** "1½" → 1.5, "2/3" → 0.667, "" → null; null when there is no number at the start. */
export function parseAmount(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  // A bare fraction first, or "2/3" reads as a whole 2 with "/3" left over.
  const bare = t.match(/^(\d+)\s*\/\s*(\d+)/);
  if (bare) return Number((Number(bare[1]) / Number(bare[2])).toFixed(3));
  const m = t.match(AMOUNT);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  let value = 0;
  // "1 1/2": a whole number followed by a fraction.
  if (m[1] && m[3] && m[4]) value = parseFloat(m[1]) + Number(m[3]) / Number(m[4]);
  else if (m[3] && m[4] && !m[1]) value = Number(m[3]) / Number(m[4]);
  else {
    if (m[1]) value += parseFloat(m[1].replace(',', '.'));
    if (m[2]) value += VULGAR[m[2]];
  }
  return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

/** The amount as an author reads it in a field: "1½", "⅔", "500". */
export function amountForField(quantity: number | null): string {
  return quantity === null ? '' : kitchenFraction(quantity);
}

const UNITS = [
  'tablespoons', 'tablespoon', 'tbsp', 'tbs', 'teaspoons', 'teaspoon', 'tsp', 'cups', 'cup', 'grams', 'gram', 'g', 'kilograms',
  'kilogram', 'kg', 'millilitres', 'milliliters', 'ml', 'litres', 'liters', 'l', 'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lb',
  'lbs', 'pinch', 'pinches', 'cloves', 'clove', 'slices', 'slice', 'cans', 'can', 'sticks', 'stick', 'bunch', 'handful', 'large',
  'medium', 'small', 'fl oz',
];
const UNIT = new RegExp(`^(${UNITS.sort((a, b) => b.length - a.length).map((u) => u.replace(' ', '\\s')).join('|')})\\.?(?=\\s|$)`, 'i');

/** One ingredient line read into amount, unit and name. */
export function parseIngredientLine(line: string): Component {
  const text = line.replace(/^[\s•*\-–—·]+/, '').trim();
  const m = text.match(AMOUNT);
  const bare = text.match(/^\d+\s*\/\s*\d+/);
  const amountText = bare ? bare[0] : m && (m[1] || m[2] || m[3]) ? m[0] : '';
  const quantity = amountText ? parseAmount(amountText) : null;
  let rest = text.slice(amountText.length).trim();
  let unit = '';
  if (quantity !== null) {
    const u = rest.match(UNIT);
    if (u) {
      unit = u[1].toLowerCase().replace(/\s+/g, ' ');
      rest = rest.slice(u[0].length).trim();
    }
  }
  return { quantity, unit, name: rest.replace(/^of\s+/i, '') || text };
}

/** A pasted block of lines as rows; a single line is left to the field it was pasted into. */
export function parseIngredientBlock(text: string): Component[] | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  return lines.map(parseIngredientLine);
}
