import type { Page } from '@playwright/test';
import { regularRecipeId, sharedSlug } from './fixtures.ts';

/*
 * What a /ui-review run photographs, and which reviewer owns each screen.
 *
 * Reconcile this with the routes in src/App.tsx at the start of every run: a
 * screen the app has and this list lacks is a screen nobody reviews. Owners
 * are the reviewer agents in .claude/agents/ui-review-*.md; the Keeper reads
 * every screen and is not listed.
 */

export type Owner = 'first-timer' | 'link-follower' | 'mid-bake' | 'librarian';

export interface Screen {
  name: string;
  who: 'stranger' | 'regular';
  path: string;
  owner: Owner;
  /** Light is the default theme; dark is shot where the screen is used at night or in a kitchen. */
  themes: ('light' | 'dark')[];
  /** The stranger has already come through the landing page and its welcome. */
  visited?: boolean;
  /** Only at one width: a phone-only sheet, say. */
  only?: 'w375' | 'w1280';
  /** Gets from `path` to the state worth photographing. */
  steps?: (page: Page) => Promise<void>;
}

export const SCREENS: Screen[] = [
  { name: 'stranger-landing', who: 'stranger', path: '/welcome', owner: 'first-timer', themes: ['light', 'dark'] },
  {
    name: 'stranger-onboarding',
    who: 'stranger',
    path: '/',
    owner: 'first-timer',
    themes: ['light'],
    steps: async (page) => {
      await page.waitForURL('**/welcome');
      await page.getByRole('button', { name: /open the cookbook|get started|start/i }).first().click();
      await page.waitForURL((u) => u.pathname === '/');
      await page.getByRole('dialog').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
    },
  },
  { name: 'stranger-empty-cookbook', who: 'stranger', path: '/', owner: 'first-timer', themes: ['light'], visited: true },
  { name: 'stranger-new-recipe', who: 'stranger', path: '/new', owner: 'first-timer', themes: ['light'], visited: true },
  { name: 'stranger-shared-link', who: 'stranger', path: `/r/${sharedSlug}`, owner: 'link-follower', themes: ['light', 'dark'] },
  { name: 'stranger-discover', who: 'stranger', path: '/discover', owner: 'link-follower', themes: ['light'], visited: true },
  { name: 'stranger-profile', who: 'stranger', path: '/@proof', owner: 'link-follower', themes: ['light'] },
  { name: 'regular-recipe', who: 'regular', path: `/recipe/${regularRecipeId}`, owner: 'mid-bake', themes: ['light', 'dark'] },
  { name: 'regular-baking-mode', who: 'regular', path: `/recipe/${regularRecipeId}/bake`, owner: 'mid-bake', themes: ['light', 'dark'] },
  { name: 'regular-gallery', who: 'regular', path: '/gallery', owner: 'mid-bake', themes: ['light'] },
  { name: 'regular-analytics', who: 'regular', path: '/analytics', owner: 'mid-bake', themes: ['light'] },
  { name: 'regular-cookbook', who: 'regular', path: '/', owner: 'librarian', themes: ['light', 'dark'] },
  { name: 'regular-editor', who: 'regular', path: `/edit/${regularRecipeId}`, owner: 'librarian', themes: ['light'] },
  { name: 'regular-pantry', who: 'regular', path: '/pantry', owner: 'librarian', themes: ['light'] },
  { name: 'regular-grocery', who: 'regular', path: '/grocery', owner: 'librarian', themes: ['light'] },
  { name: 'regular-notes', who: 'regular', path: '/notes', owner: 'librarian', themes: ['light'] },
  { name: 'regular-settings', who: 'regular', path: '/settings', owner: 'librarian', themes: ['light'] },
  { name: 'regular-discover', who: 'regular', path: '/discover', owner: 'link-follower', themes: ['light'] },
  { name: 'regular-not-found', who: 'regular', path: '/no-such-page', owner: 'librarian', themes: ['light'] },
  {
    name: 'regular-phone-menu',
    who: 'regular',
    path: '/',
    owner: 'librarian',
    themes: ['light'],
    only: 'w375',
    steps: async (page) => {
      const opener = page.getByRole('button', { name: /^(more|menu)$/i }).first();
      if (await opener.count()) {
        await opener.click();
        await page.waitForTimeout(600);
      }
    },
  },
];
