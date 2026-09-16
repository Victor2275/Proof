import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActiveBake,
  startActiveBake,
  updateActiveBakeStep,
  clearActiveBake,
  subscribeActiveBake,
} from './activeBake';

describe('activeBake', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports nothing running when no bake has started', () => {
    expect(getActiveBake()).toBeNull();
  });

  it('starts a bake with a fresh timestamp', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    const bake = getActiveBake();
    expect(bake).toMatchObject({ recipeId: 'r1', recipeTitle: 'Country Loaf', stepIndex: 0 });
    expect(bake?.startedAt).toBeTruthy();
  });

  it('resuming the same recipe preserves the original startedAt', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    const first = getActiveBake();
    startActiveBake('r1', 'Country Loaf', 3);
    const second = getActiveBake();
    expect(second?.stepIndex).toBe(3);
    expect(second?.startedAt).toBe(first?.startedAt);
  });

  it('starting a different recipe supersedes the previous bake with a new timestamp', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T06:00:00.000Z'));
      startActiveBake('r1', 'Country Loaf', 4);
      const first = getActiveBake();

      vi.setSystemTime(new Date('2026-01-01T09:00:00.000Z'));
      startActiveBake('r2', 'Baguette', 0);
      const second = getActiveBake();

      expect(second?.recipeId).toBe('r2');
      expect(second?.startedAt).not.toBe(first?.startedAt);
    } finally {
      vi.useRealTimers();
    }
  });

  it('updateActiveBakeStep is a no-op for a recipe that is not the active one', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    updateActiveBakeStep('r2', 5);
    expect(getActiveBake()).toMatchObject({ recipeId: 'r1', stepIndex: 0 });
  });

  it('updateActiveBakeStep advances the active recipe', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    updateActiveBakeStep('r1', 2);
    expect(getActiveBake()?.stepIndex).toBe(2);
  });

  it('clearActiveBake(id) only clears when the id matches', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    clearActiveBake('r2');
    expect(getActiveBake()).not.toBeNull();
    clearActiveBake('r1');
    expect(getActiveBake()).toBeNull();
  });

  it('clearActiveBake() with no argument always clears', () => {
    startActiveBake('r1', 'Country Loaf', 0);
    clearActiveBake();
    expect(getActiveBake()).toBeNull();
  });

  it('survives a corrupt localStorage value instead of throwing', () => {
    localStorage.setItem('activeBake', '{not json');
    expect(getActiveBake()).toBeNull();
  });

  it('notifies subscribers when the active bake changes', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeActiveBake(onChange);
    startActiveBake('r1', 'Country Loaf', 0);
    expect(onChange).toHaveBeenCalledTimes(1);
    updateActiveBakeStep('r1', 1);
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
    updateActiveBakeStep('r1', 2);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
