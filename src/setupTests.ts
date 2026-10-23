// src/setupTests.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, vi } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { closeDB } from './lib/repo/db';

/*
 * fake-indexeddb stores values with Node's structuredClone, which does not
 * know jsdom's Blob and flattens it to a plain object, so a stored photograph
 * would come back without its bytes. A browser's IndexedDB keeps Blobs whole;
 * Node's own Blob gives the tests the same behaviour.
 */
globalThis.Blob = NodeBlob as unknown as typeof Blob;
globalThis.File = NodeFile as unknown as typeof File;

/*
 * The cookbook lives in IndexedDB, which jsdom does not have. Each test gets a
 * fresh, empty in-memory one, so tests exercise the real repository rather
 * than a mock of it, and no test can see another's records.
 */
beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.clearAllMocks();
});

/*
 * `findBy…` and `waitFor` give up after one second by default. A screen read
 * from IndexedDB answers in milliseconds alone, but the full suite runs fifty
 * files in parallel and a busy worker can take longer, which failed tests that
 * were not wrong. Five seconds is still well inside the test timeout.
 */
configure({ asyncUtilTimeout: 5000 });

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
