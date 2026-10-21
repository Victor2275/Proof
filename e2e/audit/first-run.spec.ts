import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset, publishedFrom } from './datasets';

/*
 * A stranger's first session, end to end (LAUNCH_PLAN.md, A2 and B15).
 *
 * The matrix pre-dismisses the landing redirect and the onboarding modal so it
 * can shoot each surface on its own. This walks them instead, with nothing on
 * the device and the live library behind the API as the shared cookbook — which
 * is what a person arriving from a shared link meets: their own empty cookbook,
 * offered a shelf of recipes to start from.
 */

const OUT = join(process.cwd(), 'audit-shots', 'first-run');

test('a stranger arrives', async ({ page }, info) => {
  test.skip(info.project.name === 'w768', 'phone and desktop are enough for a sequence');
  mkdirSync(OUT, { recursive: true });
  const shared = publishedFrom(dataset('typical').recipes);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/socket.io/**', (r) => r.abort('connectionrefused'));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const featured = shared.filter((p) => p.featured);
    const body = url.pathname.endsWith('/published')
      ? { items: featured, total: featured.length, offset: 0, limit: 8 }
      : { status: 'ok' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const shot = (step: string) =>
    page.screenshot({ path: join(OUT, `${step}__${info.project.name}.png`), animations: 'disabled' });

  // A shared link to a recipe is the likeliest first contact; it is bounced to /welcome.
  await page.goto('/');
  await page.waitForURL('**/welcome');
  await page.getByRole('button', { name: /Open the cookbook/i }).waitFor();
  await shot('1-landing');

  await page.getByRole('button', { name: /Open the cookbook/i }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.getByRole('dialog').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  await shot('2-onboarding');

  const facts = await page.evaluate(() => ({
    dialog: (document.querySelector('[role="dialog"]') as HTMLElement | null)?.innerText.slice(0, 400) ?? null,
    heading: (document.querySelector('main h1, main h2') as HTMLElement | null)?.innerText ?? null,
  }));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const dismissedByEscape = (await page.getByRole('dialog').count()) === 0;
  await shot('3-cookbook');

  writeFileSync(
    join(OUT, `facts__${info.project.name}.json`),
    JSON.stringify({ ...facts, dismissedByEscape }, null, 2),
  );
});
