import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyTheme, readTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('is paper when nothing has been chosen', () => {
    expect(readTheme()).toBe('light');
  });

  it('reads back a stored choice, and ignores a value it does not know', () => {
    localStorage.setItem('theme', 'dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem('theme', 'system');
    expect(readTheme()).toBe('system');
    localStorage.setItem('theme', 'oled');
    expect(readTheme()).toBe('light');
  });

  it('stores and applies an explicit choice', () => {
    applyTheme('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('follows the device under "system"', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    matchMedia.mockReturnValue({ matches: false } as MediaQueryList);
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    matchMedia.mockRestore();
  });
});
