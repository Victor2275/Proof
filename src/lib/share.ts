import type { Component } from './types';
import { friendlyAmountText } from './quantities';
import { cleanText, methodSteps } from './recipeText';

/*
 * Sharing through the system's own sheet (APP_FEEL_DEBATE L13).
 *
 * The phone already knows how its owner shares things — the messaging apps,
 * the nearby devices, the notes app — so Share opens that sheet when the
 * browser offers it. Where it does not (most desktops, older WebViews), the
 * caller opens Proof's own sheet instead: copy, QR, print.
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'unavailable';

export async function systemShare(data: { title: string; text?: string; url?: string }): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unavailable';
  if (navigator.canShare && !navigator.canShare(data)) return 'unavailable';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    // Closing the sheet is a choice, not a failure.
    return err instanceof DOMException && err.name === 'AbortError' ? 'cancelled' : 'unavailable';
  }
}

/** A recipe as plain text, the way it reads when pasted into a message. */
export function recipeAsText(
  recipe: { title: string; ingredients?: Component[]; instructions?: string[] },
  scale = 1,
): string {
  const lines = [recipe.title, '', 'Ingredients'];
  for (const ing of recipe.ingredients ?? []) {
    const amount = friendlyAmountText(ing.quantity, ing.unit, scale);
    lines.push(`- ${amount ? `${amount} ` : ''}${cleanText(ing.name)}`);
  }
  const steps = methodSteps(recipe.instructions);
  if (steps.length) {
    lines.push('', 'Method');
    let heading: string | null = null;
    for (const step of steps) {
      if (step.heading && step.heading !== heading) lines.push(step.heading);
      heading = step.heading;
      lines.push(`${step.number}. ${step.text}`);
    }
  }
  return lines.join('\n');
}

/** The ingredients alone, as a checklist to paste into a notes app. */
export function ingredientsAsText(recipe: { title: string; ingredients?: Component[] }, scale = 1): string {
  const lines = [recipe.title, ''];
  for (const ing of recipe.ingredients ?? []) {
    const amount = friendlyAmountText(ing.quantity, ing.unit, scale);
    lines.push(`- [ ] ${amount ? `${amount} ` : ''}${cleanText(ing.name)}`);
  }
  return lines.join('\n');
}
