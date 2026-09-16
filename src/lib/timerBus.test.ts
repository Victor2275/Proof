import { describe, it, expect, vi } from 'vitest';
import {
  publishRunningTimers,
  getRunningTimers,
  subscribeRunningTimers,
  formatTimerClock,
} from './timerBus';

describe('timerBus', () => {
  it('hands the latest published timers to anyone who asks', () => {
    publishRunningTimers([{ id: 'a', name: 'Bulk', remainingMs: 1000, running: true }]);
    expect(getRunningTimers()).toEqual([
      { id: 'a', name: 'Bulk', remainingMs: 1000, running: true },
    ]);
  });

  it('notifies subscribers, and stops once they unsubscribe', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeRunningTimers(onChange);

    publishRunningTimers([]);
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    publishRunningTimers([{ id: 'b', name: 'Proof', remainingMs: 60_000, running: false }]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('returns the same array between publishes, so a store subscriber stays stable', () => {
    publishRunningTimers([{ id: 'c', name: 'Bake', remainingMs: 5_000, running: true }]);
    expect(getRunningTimers()).toBe(getRunningTimers());
  });
});

describe('formatTimerClock', () => {
  it('reads minutes and seconds, zero-padded so the display never shifts width', () => {
    expect(formatTimerClock(12 * 60_000 + 40_000)).toBe('12:40');
    expect(formatTimerClock(5_000)).toBe('00:05');
  });

  it('adds an hours cell only once there are hours to show', () => {
    expect(formatTimerClock(4 * 3_600_000 + 5 * 60_000)).toBe('4:05:00');
    expect(formatTimerClock(59 * 60_000)).toBe('59:00');
  });

  it('counts overtime upward, marked with the one non-digit a cell can draw', () => {
    // A proof left too long is still information; the display keeps counting
    // rather than sitting at zero.
    expect(formatTimerClock(-90_000)).toBe('-01:30');
  });
});
