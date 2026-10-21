/*
 * How an ingredient's amount is written.
 *
 * An ingredient may have no amount at all ("Bread, to serve"), which used to
 * be stored as an invented 1 and drawn as "1 to serve". It is null now, and
 * every surface that prints an amount goes through here so none of them draws
 * a 0, a "null", or a stray space where there is nothing to say.
 */
import type { Component } from './types';

/** A quantity scaled and rounded for reading: 0.6666 → 0.67, 2.000 → 2. */
export function scaledQuantity(quantity: number | null | undefined, scale = 1): number | null {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return null;
  return Number((quantity * scale).toFixed(2));
}

/** "2 tbsp", "3", or '' when the ingredient has no amount. */
export function formatAmount(ing: Pick<Component, 'quantity' | 'unit'>, scale = 1): string {
  const q = scaledQuantity(ing.quantity, scale);
  if (q === null) return '';
  return ing.unit ? `${q} ${ing.unit}` : String(q);
}

/** "2 tbsp Olive oil", or just "Bread, to serve". */
export function formatIngredient(ing: Component, scale = 1): string {
  const amount = formatAmount(ing, scale);
  return amount ? `${amount} ${ing.name}` : ing.name;
}
