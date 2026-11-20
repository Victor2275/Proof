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
    name: 'stranger-first-open',
    who: 'stranger',
    path: '/',
    owner: 'first-timer',
    themes: ['light'],
    steps: async (page) => {
      await page.waitForURL('**/welcome');
      await page.getByRole('button', { name: /open my cookbook/i }).first().click();
      await page.waitForURL((u) => u.pathname === '/');
    },
  },
  { name: 'stranger-empty-cookbook', who: 'stranger', path: '/', owner: 'first-timer', themes: ['light'], visited: true },
  { name: 'stranger-new-recipe', who: 'stranger', path: '/new', owner: 'first-timer', themes: ['light'], visited: true },
  { name: 'stranger-shared-link', who: 'stranger', path: `/r/${sharedSlug}`, owner: 'link-follower', themes: ['light', 'dark'] },
  { name: 'stranger-discover', who: 'stranger', path: '/discover', owner: 'link-follower', themes: ['light'], visited: true },
  { name: 'stranger-profile', who: 'stranger', path: '/@proof', owner: 'link-follower', themes: ['light'] },
  {
    name: 'stranger-sign-up',
    who: 'stranger',
    path: '/discover',
    owner: 'link-follower',
    themes: ['light'],
    visited: true,
    steps: async (page) => {
      await page.getByRole('button', { name: 'Your account and settings' }).first().click();
      await page.getByRole('menuitem', { name: 'Sign in' }).or(page.getByRole('link', { name: 'Sign in' })).or(page.getByRole('button', { name: 'Sign in' })).first().click();
      await page.getByRole('button', { name: 'Create an account' }).first().click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
  { name: 'regular-recipe', who: 'regular', path: `/recipe/${regularRecipeId}`, owner: 'mid-bake', themes: ['light', 'dark'] },
  { name: 'regular-baking-mode', who: 'regular', path: `/recipe/${regularRecipeId}/bake`, owner: 'mid-bake', themes: ['light', 'dark'] },
  { name: 'regular-bakes-journal', who: 'regular', path: '/bakes', owner: 'mid-bake', themes: ['light', 'dark'] },
  { name: 'regular-bakes-by-recipe', who: 'regular', path: '/bakes?view=recipe', owner: 'mid-bake', themes: ['light'] },
  { name: 'regular-cookbook', who: 'regular', path: '/', owner: 'librarian', themes: ['light', 'dark'] },
  { name: 'regular-editor', who: 'regular', path: `/edit/${regularRecipeId}`, owner: 'librarian', themes: ['light'] },
  { name: 'regular-shop', who: 'regular', path: '/shop', owner: 'librarian', themes: ['light'] },
  { name: 'regular-cupboard', who: 'regular', path: '/shop?view=cupboard', owner: 'librarian', themes: ['light'] },
  { name: 'regular-published', who: 'regular', path: '/published', owner: 'link-follower', themes: ['light'] },
  { name: 'regular-notes', who: 'regular', path: '/notes', owner: 'librarian', themes: ['light'] },
  { name: 'regular-settings', who: 'regular', path: '/settings', owner: 'librarian', themes: ['light'] },
  { name: 'regular-discover', who: 'regular', path: '/discover', owner: 'link-follower', themes: ['light'] },
  { name: 'regular-not-found', who: 'regular', path: '/no-such-page', owner: 'librarian', themes: ['light'] },
  {
    name: 'regular-account-menu',
    who: 'regular',
    path: '/',
    owner: 'librarian',
    themes: ['light'],
    steps: async (page) => {
      await page.getByRole('button', { name: 'Your account and settings' }).first().click();
      await page.waitForTimeout(600);
    },
  },
];
