/*
 * The running timers, published for any surface that needs to display them.
 *
 * `TimerManager` owns the timers: it holds the websocket, rings the alarms and
 * renders the floating stack. Baking Mode needs the same values as segment
 * readouts docked in its own header — a timer stack floating over a full-screen
 * overlay is a stack a baker cannot reach, and one that covers the step.
 *
 * The obvious fix, having Baking Mode open its own socket, is the bug this
 * codebase already fixed once: a connection per consumer, none of them closed.
 * So the manager stays the single owner and publishes a read-only view here
 * instead. Consumers subscribe; nobody but the manager writes.
 */

export interface RunningTimer {
  id: string;
  name: string;
  /** Milliseconds left. Negative once the timer has run past its end. */
  remainingMs: number;
  /** False while paused. */
  running: boolean;
}

const CHANGE_EVENT = 'running-timers-changed';

let current: RunningTimer[] = [];

/** Called by TimerManager on every tick. Not for anyone else. */
export function publishRunningTimers(timers: RunningTimer[]): void {
  current = timers;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getRunningTimers(): RunningTimer[] {
  return current;
}

export function subscribeRunningTimers(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/**
 * A countdown as a segment display reads it: `12:40`, or `4:05:00` past an
 * hour. Overtime counts up and is marked with a leading `-`, which is the one
 * glyph a seven-segment cell can draw besides a digit.
 */
export function formatTimerClock(ms: number): string {
  const overtime = ms < 0;
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const body =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return overtime ? `-${body}` : body;
}
