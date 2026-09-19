// src/setupTests.ts
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});

/*
 * jsdom ships no `matchMedia`, and the app asks for it in two places that are
 * perfectly ordinary in a browser: the system theme in Settings, and the
 * reduced-motion check that stops the landing page's chase light. Stubbed here
 * rather than in each test, and defaulting to "no match" so reduced motion is
 * off and the light theme is the system preference unless a test says otherwise.
 */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
