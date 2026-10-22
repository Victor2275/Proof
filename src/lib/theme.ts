import { SETTINGS_KEYS } from './settings';

/*
 * The theme.
 *
 * Paper (light) is the default: with nothing stored, the book opens in
 * daylight. "Dark" is the same book at night; "System" follows the device.
 * The choice is always stored, including "system", so an absent key can only
 * ever mean "never chosen" — which is light.
 *
 * index.html runs the same rule inline before first paint so the page never
 * flashes the wrong theme; keep the two in step.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';

export function readTheme(): ThemeChoice {
  const stored = localStorage.getItem(SETTINGS_KEYS.theme);
  return stored === 'dark' || stored === 'system' ? stored : 'light';
}

export function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Stores the choice and applies it to the document. */
export function applyTheme(choice: ThemeChoice): void {
  localStorage.setItem(SETTINGS_KEYS.theme, choice);
  const dark = choice === 'dark' || (choice === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}
