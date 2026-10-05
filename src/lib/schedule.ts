import { isPlaceholderTiming, totalRecipeMinutes } from './duration';

/*
 * How long each step of a recipe takes, for the reverse bake schedule — and
 * where each figure came from.
 *
 * The schedule turns these into wall-clock start times a baker sets an alarm
 * by, so a guess must look like a guess. The old version read `prepTime` with
 * parseInt — the seed placeholder "20 mins" counted as real, "1 hour 15 mins"
 * became one minute, an empty field became an invented 30 or 45 — and found a
 * step's own time only when written "(30m)", in brackets. Every row then
 * printed its minutes with the same confidence.
 *
 * Now, in order of trust:
 *   stated   — the step names its own time ("bulk ferment for 4 hours"), read
 *              the way the timer chips read it;
 *   shared   — the step names none, so it takes an even share of what remains
 *              of the recipe's recorded total;
 *   assumed  — there is no recorded total either (or only the seed's
 *              placeholder), so the step is drawn at a flat 15 minutes.
 */

export type DurationSource = 'stated' | 'shared' | 'assumed';

export interface StepDuration {
  minutes: number;
  source: DurationSource;
}

export const ASSUMED_STEP_MINUTES = 15;

// The timer chips' pattern (utils/timerParser.tsx), so a time the method shows
// as a chip is the time the schedule uses.
const DURATION = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi;

/** The longest time a step names, in minutes: "4 hours, folding every 45 minutes" is 4 hours. */
export function statedMinutes(step: string): number | null {
  let longest: number | null = null;
  for (const match of step.matchAll(DURATION)) {
    const value = parseFloat(match[1]);
    const minutes = match[2].toLowerCase().startsWith('h') ? value * 60 : value;
    if (minutes >= 1 && (longest === null || minutes > longest)) longest = Math.round(minutes);
  }
  return longest;
}

export function stepDurations(recipe: {
  instructions?: string[];
  prepTime?: string;
  cookTime?: string;
}): StepDuration[] {
  const steps = recipe.instructions ?? [];
  const stated = steps.map(statedMinutes);
  const unstated = stated.filter((m) => m === null).length;

  const recorded = isPlaceholderTiming(recipe) ? null : totalRecipeMinutes(recipe);
  const statedTotal = stated.reduce<number>((sum, m) => sum + (m ?? 0), 0);
  const remainder = recorded === null ? 0 : recorded - statedTotal;
  const share = unstated > 0 && remainder > 0 ? Math.max(5, Math.round(remainder / unstated)) : null;

  return stated.map((minutes) => {
    if (minutes !== null) return { minutes, source: 'stated' };
    if (share !== null) return { minutes: share, source: 'shared' };
    return { minutes: ASSUMED_STEP_MINUTES, source: 'assumed' };
  });
}

/** One sentence on how far to trust the start times, or null when every step named its own. */
export function scheduleCaveat(durations: StepDuration[]): string | null {
  const total = durations.length;
  const stated = durations.filter((d) => d.source === 'stated').length;
  if (total === 0 || stated === total) return null;
  const named = stated === 0 ? 'No step names its own time' : `${stated} of ${total} steps name their own time`;
  if (durations.some((d) => d.source === 'assumed')) {
    return `${named}, and the recipe has no recorded total, so the others are drawn at ${ASSUMED_STEP_MINUTES} minutes each. Check them before you trust the start time.`;
  }
  return `${named}; the others share the rest of the recipe's recorded time.`;
}
