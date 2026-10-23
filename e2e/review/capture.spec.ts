import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedDevice } from '../seed.ts';
import { answer } from './api.ts';
import { people, server } from './fixtures.ts';
import { SCREENS, type Screen } from './screens.ts';

/*
 * The /ui-review screenshot set: what every reviewer reads, so their findings
 * are comparable. Records only.
 *
 *   REVIEW_LABEL=2026-11-02 npm run review:capture
 *
 * Per screen, per width, per theme it writes the first screen (`fold`), the
 * page scrolled to a cap (`page`), the visible text (`text.txt`), and the
 * facts a reviewer would otherwise misread a picture by (`facts.json`):
 * endpoints the mock could not answer, console errors, images that failed,
 * and sideways overflow. The facts exist because the 2026-10-21 audit shipped
 * five capture artifacts to its reviewers as if they were the app.
 */

const LABEL = process.env.REVIEW_LABEL ?? 'latest';
const OUT = join(process.cwd(), 'audit-shots', 'review', LABEL);
const PAGE_CAP = 3200;

interface Facts {
  unmocked: string[];
  consoleErrors: string[];
  brokenImages: string[];
  overflowX: boolean;
}

async function serve(page: Page, screen: Screen, theme: 'light' | 'dark', facts: Facts) {
  await seedDevice(page, people[screen.who]);
  const visited = screen.visited ?? screen.who === 'regular';
  await page.addInitScript(
    ({ theme, visited }) => {
      localStorage.setItem('theme', theme);
      if (visited) {
        localStorage.setItem('hasVisited', 'true');
        localStorage.setItem('hasSeenOnboarding', 'true');
      }
    },
    { theme, visited },
  );
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
  page.on('console', (msg) => {
    if (msg.type() === 'error') facts.consoleErrors.push(msg.text().slice(0, 300));
  });
  await page.route('**/socket.io/**', (route) => route.abort('connectionrefused'));
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const found = answer(req.method(), url, false, server);
    if (!found) facts.unmocked.push(`${req.method()} ${url.pathname}${url.search}`);
    const { status, body } = found ?? { status: 404, body: { error: 'Not found' } };
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

/** Waits for fonts, the network, and every image — lazy ones included, which the last audit shot blank. */
async function settle(page: Page, facts: Facts) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    const images = [...document.images];
    for (const img of images) img.loading = 'eager';
    const pending = images
      .filter((img) => !img.complete)
      .map((img) => new Promise((done) => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }));
    await Promise.race([Promise.all(pending), new Promise((done) => setTimeout(done, 8_000))]);
  });
  await page.waitForTimeout(600);
  facts.brokenImages = await page.evaluate(() =>
    [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
  );
  facts.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

async function shoot(page: Page, name: string, facts: Facts) {
  mkdirSync(OUT, { recursive: true });
  const file = (kind: string) => join(OUT, `${name}__${kind}`);
  await page.screenshot({ path: file('fold.png'), animations: 'disabled' });
  // The app shell scrolls inside <main>, not the document; let the document grow so the page shot sees it all.
  // Side-effect, not a bug: chrome pinned to the viewport (a sidebar, a tab bar) stops short in the page shot.
  await page.addStyleTag({
    content: '.h-screen,.h-dvh{height:auto!important;overflow:visible!important} main{overflow:visible!important}',
  });
  await page.waitForTimeout(300);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = page.viewportSize()!.width;
  await page.screenshot({
    path: file('page.png'),
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.min(height, PAGE_CAP) },
    animations: 'disabled',
  });
  const text = await page.evaluate(() => (document.querySelector('main') ?? document.body).innerText.slice(0, 4000));
  writeFileSync(file('text.txt'), text);
  writeFileSync(file('facts.json'), JSON.stringify(facts, null, 2));
}

for (const screen of SCREENS) {
  for (const theme of screen.themes) {
    test(`${screen.name} ${theme}`, async ({ page }, info) => {
      test.skip(!!screen.only && screen.only !== info.project.name, `${screen.name} is a ${screen.only} surface`);
      const facts: Facts = { unmocked: [], consoleErrors: [], brokenImages: [], overflowX: false };
      await serve(page, screen, theme, facts);
      await page.goto(screen.path);
      if (screen.steps) await screen.steps(page);
      await settle(page, facts);
      await shoot(page, `${screen.owner}__${screen.name}__${theme}__${info.project.name}`, facts);
    });
  }
}
