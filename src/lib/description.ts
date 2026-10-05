/*
 * The seed description.
 *
 * 200 of the 203 recipes in the live library were imported from TheMealDB by
 * a seed script that wrote `A delicious ${area} ${category} dish.` as their
 * description — "A delicious Venezuela Beef dish.", "A delicious Side dish."
 * for a Danish rye bread. It is a template, not a description, and printing it
 * under every title is the library telling the same nothing two hundred times.
 *
 * Narrow on purpose, like `isPlaceholderTiming`: the tell is the template's
 * exact shape — TheMealDB's capitalised area and category words, sometimes
 * empty, between "A delicious" and "dish." A baker who writes "a delicious
 * lamb dish." in their own words still sees it.
 */
const SEED_DESCRIPTION = /^A delicious(?:\s+[A-Z][A-Za-z-]*){0,3}\s+dish\.$/;

export function isPlaceholderDescription(description: string | undefined | null): boolean {
  return SEED_DESCRIPTION.test((description ?? '').trim());
}

/** The description worth showing, or null when there is none or only the seed's. */
export function meaningfulDescription(description: string | undefined | null): string | null {
  const text = (description ?? '').trim();
  if (!text || isPlaceholderDescription(text)) return null;
  return text;
}
