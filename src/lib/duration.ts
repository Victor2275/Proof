/**
 * Parsing recipe durations into minutes for the segment readout.
 *
 * The schema's own convention (see BasicInfoForm.tsx, ReverseBakeScheduler.tsx)
 * is a bare number of minutes stored as a string: "30", "45". AI-imported
 * recipes are less disciplined and sometimes produce unit-annotated or
 * bracket-wrapped text instead — "[50 mins]", "1 hr 30 mins" — which is the
 * same literal-bracket data RecipeHeader.tsx already strips defensively. This
 * parser accepts both rather than assuming the clean case.
 */

const UNIT_DURATION = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi;

export function parseDurationMinutes(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const text = raw.replace(/[[\]]/g, '').trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(parseFloat(text));

  const re = new RegExp(UNIT_DURATION);
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    matched = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    total += unit.startsWith('h') ? value * 60 : value;
  }
  return matched ? Math.round(total) : null;
}

/** Sums prep + cook; null only when neither side parsed to anything. */
export function totalRecipeMinutes(recipe: {
  prepTime?: string;
  cookTime?: string;
}): number | null {
  const prep = parseDurationMinutes(recipe.prepTime);
  const cook = parseDurationMinutes(recipe.cookTime);
  if (prep === null && cook === null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

/** Formats total minutes for a SegmentReadout: "45" / "MIN" or "1:30" / "HR". */
export function formatMinutesForSegments(totalMinutes: number): { value: string; unit: string } {
  if (totalMinutes < 60) return { value: String(totalMinutes), unit: 'MIN' };
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { value: `${hours}:${String(minutes).padStart(2, '0')}`, unit: 'HR' };
}
