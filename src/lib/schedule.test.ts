import { describe, it, expect } from 'vitest';
import { statedMinutes, stepDurations, scheduleCaveat, ASSUMED_STEP_MINUTES } from './schedule';

describe('statedMinutes', () => {
  it('reads a time written into the step the way the timer chips do', () => {
    expect(statedMinutes('Simmer for 2 to 3 minutes.')).toBe(3);
    expect(statedMinutes('Bake at 230C for 35 mins.')).toBe(35);
  });

  it('takes the longest time a step names, not an interval inside it', () => {
    expect(statedMinutes('Bulk ferment for 4 hours, with a stretch and fold every 45 minutes.')).toBe(240);
  });

  it('finds nothing in a step that names no time', () => {
    expect(statedMinutes('Shape into a boule.')).toBeNull();
  });
});

describe('stepDurations', () => {
  it('shares what remains of a recorded total among the steps that name no time', () => {
    const durations = stepDurations({
      instructions: ['Mix the dough.', 'Rest for 30 minutes.', 'Shape and bake.'],
      prepTime: '60',
      cookTime: '30',
    });
    expect(durations).toEqual([
      { minutes: 30, source: 'shared' },
      { minutes: 30, source: 'stated' },
      { minutes: 30, source: 'shared' },
    ]);
  });

  /*
   * The seed's "20 mins" / "30 mins" used to be parsed as real, and an empty
   * field became an invented 30 or 45.
   */
  it('does not spread the seed placeholder as if it were a measured total', () => {
    const durations = stepDurations({
      instructions: ['Put the prawns in a bowl.', 'Fry for 2 minutes.'],
      prepTime: '20 mins',
      cookTime: '30 mins',
    });
    expect(durations).toEqual([
      { minutes: ASSUMED_STEP_MINUTES, source: 'assumed' },
      { minutes: 2, source: 'stated' },
    ]);
  });

  it('reads a unit-annotated total instead of parseInt-ing it to one minute', () => {
    const [step] = stepDurations({ instructions: ['Braise.'], prepTime: '', cookTime: '1 hour 15 mins' });
    expect(step).toEqual({ minutes: 75, source: 'shared' });
  });

  it('assumes rather than invents when there is no recorded time at all', () => {
    const [step] = stepDurations({ instructions: ['Mix.'], prepTime: '', cookTime: '' });
    expect(step.source).toBe('assumed');
  });
});

describe('scheduleCaveat', () => {
  it('says nothing when every step named its own time', () => {
    expect(scheduleCaveat([{ minutes: 10, source: 'stated' }])).toBeNull();
  });

  it('warns that assumed steps need checking', () => {
    const caveat = scheduleCaveat([
      { minutes: 15, source: 'assumed' },
      { minutes: 2, source: 'stated' },
    ]);
    expect(caveat).toMatch(/1 of 2 steps name their own time/);
    expect(caveat).toMatch(/Check them before you trust the start time/);
  });
});
