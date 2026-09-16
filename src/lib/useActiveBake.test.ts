import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveBake } from './useActiveBake';
import { startActiveBake, clearActiveBake } from './activeBake';

describe('useActiveBake', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads the active bake on mount', () => {
    startActiveBake('r1', 'Country Loaf', 2);
    const { result } = renderHook(() => useActiveBake());
    expect(result.current).toMatchObject({ recipeId: 'r1', stepIndex: 2 });
  });

  it('re-renders when the active bake changes after mount', () => {
    const { result } = renderHook(() => useActiveBake());
    expect(result.current).toBeNull();

    act(() => {
      startActiveBake('r1', 'Country Loaf', 0);
    });
    expect(result.current?.recipeId).toBe('r1');

    act(() => {
      clearActiveBake('r1');
    });
    expect(result.current).toBeNull();
  });
});
