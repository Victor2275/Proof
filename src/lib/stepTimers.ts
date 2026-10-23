/*
 * Times written into a step: "bake for 50–60 minutes", "rest 1 hour",
 * "30 seconds". Each one is a timer a cook can start from the sentence.
 *
 * A range is one timer, not two: "50–60 min" used to become "50–" and a
 * sixty-minute timer, which rings ten minutes after the cake should have been
 * checked. A range starts at its shorter end, because that is when to look.
 */
export interface StepTimer {
  /** Where the phrase starts and ends in the text. */
  start: number;
  end: number;
  /** The phrase as written: "50–60 min". */
  label: string;
  /** The timer's length: the shorter end of a range. */
  seconds: number;
}

const TIME = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;

function toSeconds(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return value * 3600;
  if (u.startsWith('m')) return value * 60;
  return value;
}

export function findTimers(text: string): StepTimer[] {
  const found: StepTimer[] = [];
  const re = new RegExp(TIME);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const low = parseFloat(match[1]);
    const high = match[2] ? parseFloat(match[2]) : null;
    const seconds = Math.round(toSeconds(high === null ? low : Math.min(low, high), match[3]));
    if (seconds <= 0) continue;
    found.push({ start: match.index, end: match.index + match[0].length, label: match[0], seconds });
  }
  return found;
}

/** Asks TimerManager to start a timer. `ask` puts up its confirmation first. */
export function startTimer(seconds: number, name: string, { ask = false } = {}): void {
  window.dispatchEvent(new CustomEvent('add-timer', { detail: { durationSecs: seconds, name, forceStart: !ask } }));
}
