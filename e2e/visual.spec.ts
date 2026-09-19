import { test, expect, type Page } from '@playwright/test';
import { pinEnvironment, useTheme } from './fixtures';

/*
 * Visual regression baselines — REWORK_PLAN.md Phase 8.
 *
 * One image per surface per theme, at both a desktop and a phone width. Nine
 * phases rebuilt every one of these by hand; the baselines are what stop the
 * tenth change quietly undoing one.
 *
 * These are deliberately whole-page shots. The unit suite already asserts
 * behaviour in detail; what it cannot see is a panel losing its rule, a row
 * wrapping at 390px, or light mode turning to soup — which is exactly what a
 * design rework regresses.
 */

const SURFACES = [
  { name: 'dashboard', path: '/', settle: 'text=72-Hour Sourdough' },
  { name: 'recipe-viewer', path: '/recipe/r-sourdough', settle: 'text=Ingredients' },
  { name: 'editor', path: '/edit/r-sourdough', settle: 'text=Identity' },
  { name: 'editor-new', path: '/new', settle: 'text=Import from a URL' },
  { name: 'notes', path: '/notes', settle: 'text=The bench notebook' },
  { name: 'settings', path: '/settings', settle: 'text=Appearance' },
  { name: 'analytics', path: '/analytics', settle: 'text=Totals' },
  { name: 'pantry', path: '/pantry', settle: 'text=In stock' },
  { name: 'gallery', path: '/gallery', settle: 'body' },
  { name: 'not-found', path: '/no-such-page', settle: 'text=Nothing at this address' },
] as const;

/**
 * Waits for the page to stop moving: fonts loaded, images decoded, no skeleton
 * left. Without this the shot races the self-hosted faces and every baseline
 * differs by a few pixels of fallback metrics.
 */
async function settle(page: Page, selector: string) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const images = Array.from(document.images);
    return images.every((img) => img.complete);
  });
  await expect(page.locator('.animate-pulse')).toHaveCount(0);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    for (const surface of SURFACES) {
      test(`${surface.name}`, async ({ page }) => {
        await useTheme(page, theme);
        await pinEnvironment(page);
        await page.goto(surface.path);
        await settle(page, surface.settle);

        await expect(page).toHaveScreenshot(`${surface.name}-${theme}.png`, {
          fullPage: true,
        });
      });
    }
  });
}

/*
 * The landing page is the one surface routed outside the app shell, and the one
 * a stranger sees. Its chase light runs on a timer, so it is pinned to a known
 * phase by asking for reduced motion — which is also the assertion that the
 * chase actually honours it.
 */
test.describe('landing page', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`held still, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await useTheme(page, theme);
      await pinEnvironment(page);
      await page.goto('/welcome');
      await settle(page, 'text=A recipe is a pattern');

      // No app chrome: a stranger has not entered the product yet.
      await expect(page.getByRole('navigation')).toHaveCount(0);

      await expect(page).toHaveScreenshot(`landing-${theme}.png`, { fullPage: true });
    });
  }
});

/*
 * Overlays. The Sheet primitive replaced eleven hand-rolled scrims, so the
 * scrim's blur, the panel's head and the foot's controls are worth a baseline
 * of their own.
 */
test.describe('overlays', () => {
  /*
   * The centred dialog is the desktop reading of the primitive; the phone gets
   * its own case below, because a sheet that rises from the bottom edge is a
   * different shape rather than the same one squeezed.
   */
  test.describe('as a dialog', () => {
    test('delete confirmation sheet', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the desktop reading');
      await useTheme(page, 'dark');
      await pinEnvironment(page);
      await page.goto('/notes');
      await settle(page, 'text=The bench notebook');

      await page.getByRole('button', { name: 'Delete Starter timing' }).click();
      await expect(page.getByRole('dialog', { name: 'Delete note' })).toBeVisible();

      await expect(page).toHaveScreenshot('sheet-confirm-dark.png');
    });

    test('sub-recipe link sheet', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the desktop reading');
      await useTheme(page, 'dark');
      await pinEnvironment(page);
      await page.goto('/edit/r-sourdough');
      await settle(page, 'text=Identity');

      await page.getByRole('button', { name: /Link recipe/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await expect(page).toHaveScreenshot('sheet-link-dark.png');
    });
  });

  test.describe('as a bottom sheet', () => {
    // The notes list is unreachable on a phone any other way — the rail it
    // lives in is `hidden md:block`.
    test('the notes list', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'the phone reading');
      await useTheme(page, 'dark');
      await pinEnvironment(page);
      await page.goto('/notes');
      await settle(page, 'text=The bench notebook');

      await page.getByRole('button', { name: /All notes/i }).click();
      await expect(page.getByRole('dialog', { name: /Notes/ })).toBeVisible();

      await expect(page).toHaveScreenshot('sheet-bottom-dark.png');
    });
  });
});

/*
 * The floor, not a baseline: 375px is the narrowest the layouts must survive,
 * and nothing may scroll sideways there. Asserted rather than photographed,
 * because it is a fact about the layout and not a matter of taste.
 */
test.describe('375px floor', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const surface of SURFACES) {
    test(`${surface.name} does not scroll sideways`, async ({ page }) => {
      await useTheme(page, 'dark');
      await pinEnvironment(page);
      await page.goto(surface.path);
      await settle(page, surface.settle);

      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement!;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }
});
