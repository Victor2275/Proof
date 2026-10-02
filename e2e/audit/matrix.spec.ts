import { test, type Page, type Route } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset, recipeIdFor, type DatasetName } from './datasets';

/*
 * Phase 0, Stage A — the screenshot matrix (LAUNCH_PLAN.md, A1 and A1b).
 *
 * An inventory, not an assertion suite: nothing here fails on what it finds.
 * Every cell writes a full-page shot and a facts file to audit-shots/, and
 * scripts/audit-report.mjs turns the facts into tables and the shots into
 * contact sheets for review. The audit is meant to be re-run at C4, after every
 * new multi-user surface exists, so it is scripted rather than clicked through.
 *
 *   width  375 · 768 · 1280      — the projects in playwright.audit.config.ts
 *   theme  light · dark
 *   data   empty · typical · overflowing
 *   state  loaded, plus loading · error · offline against the typical library
 */

const OUT = join(process.cwd(), 'audit-shots');

/**
 * A full run is a few hundred cold page loads against the dev server and takes
 * a while. AUDIT_RESUME=1 skips any cell that already has its facts on disk, so
 * an interrupted run picks up where it stopped.
 */
function resumable(id: string) {
  test.skip(!!process.env.AUDIT_RESUME && existsSync(join(OUT, 'facts', `${id}.json`)), 'already shot');
  return id;
}

type Surface = { name: string; path: (id: string) => string };

const SURFACES: Surface[] = [
  { name: 'dashboard', path: () => '/' },
  { name: 'recipe-viewer', path: (id) => `/recipe/${id}` },
  { name: 'baking-mode', path: (id) => `/recipe/${id}/bake` },
  { name: 'editor', path: (id) => `/edit/${id}` },
  { name: 'editor-new', path: () => '/new' },
  { name: 'gallery', path: () => '/gallery' },
  { name: 'analytics', path: () => '/analytics' },
  { name: 'pantry', path: () => '/pantry' },
  { name: 'grocery', path: () => '/grocery' },
  { name: 'notes', path: () => '/notes' },
  { name: 'settings', path: () => '/settings' },
  { name: 'not-found', path: () => '/no-such-page' },
  { name: 'landing', path: () => '/welcome' },
  { name: 'lab', path: () => '/lab' },
];

// The surfaces that read no library data are shot once, against the typical column.
const DATA_FREE = new Set(['landing', 'lab', 'not-found', 'editor-new']);

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR42mPoaqvDihiGlgQA5AJjgRMkCsUAAAAASUVORK5CYII=',
  'base64',
);

type State = 'loaded' | 'loading' | 'error' | 'offline';

/** The API as a stranger without the PIN meets it: reads answer, writes are refused. */
async function serve(page: Page, name: DatasetName, state: State) {
  const data = dataset(name);
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/fixture.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  // Timers sync over a socket to a server that is not running here.
  await page.route('**/socket.io/**', (route) => route.abort('connectionrefused'));

  await page.route('**/api/**', async (route) => {
    if (state === 'loading') return; // never answers
    if (state === 'offline') return route.abort('internetdisconnected');
    if (state === 'error') return json(route, { error: 'Internal server error' }, 500);

    const req = route.request();
    if (req.method() !== 'GET') return json(route, { error: 'Admin authentication required.' }, 401);

    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const parts = path.split('/').filter(Boolean);
    const idOf = (r: unknown) => (typeof r === 'string' ? r : (r as { _id: string })._id);

    if (parts[0] === 'recipes' && parts.length === 1) return json(route, data.recipes);
    if (parts[0] === 'recipes' && parts[2] === 'bakelogs') {
      return json(route, data.bakelogs.filter((b) => idOf(b.recipeId) === parts[1]));
    }
    if (parts[0] === 'recipes' && parts.length === 2) {
      const recipe = data.recipes.find((r) => r._id === parts[1]);
      return recipe ? json(route, recipe) : json(route, { error: 'Recipe not found' }, 404);
    }
    if (parts[0] === 'bakelogs') return json(route, data.bakelogs);
    if (parts[0] === 'notes') return json(route, data.notes);
    if (parts[0] === 'pantry') return json(route, data.pantry);
    return json(route, []);
  });
}

async function prepare(page: Page, theme: 'dark' | 'light', state: State) {
  const cache = state === 'offline' ? dataset('typical') : null;
  await page.addInitScript(
    ({ theme, cache, offline }) => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('hasVisited', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      // Offline is a returning user: the API's read cache is warm, the network is gone.
      if (cache) {
        localStorage.setItem('cached_recipes', JSON.stringify(cache.recipes));
        localStorage.setItem('cached_bakelogs', JSON.stringify(cache.bakelogs));
        localStorage.setItem('cached_pantry', JSON.stringify(cache.pantry));
      }
      // Real offline emulation would also block the dev server's modules, so the
      // browser is told it is offline and the API is made unreachable instead.
      if (offline) Object.defineProperty(navigator, 'onLine', { get: () => false });
    },
    { theme, cache, offline: state === 'offline' },
  );
}

/** Lets the page come to rest without requiring that it ever does — a stuck page is a finding. */
async function settle(page: Page, state: State): Promise<number | null> {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  if (state === 'loading') {
    await page.waitForTimeout(1500);
    return null;
  }
  // How long a skeleton stands is itself a reading: a local read should never flash one (B30).
  const started = Date.now();
  /*
   * Rest means the route has rendered and no skeleton is standing, held for
   * 600ms — a single check passes in the gap before the lazy route mounts its
   * own skeleton.
   */
  const cleared = await page
    .waitForFunction(
      () => {
        const w = window as unknown as { __restSince?: number };
        const main = document.querySelector('main');
        const atRest =
          document.querySelectorAll('.animate-pulse').length === 0 &&
          !!main && main.innerText.trim().length > 0 && !/^Loading/.test(main.innerText.trim());
        if (!atRest) { w.__restSince = undefined; return false; }
        w.__restSince ??= performance.now();
        return performance.now() - w.__restSince > 600;
      },
      null,
      { timeout: 15_000, polling: 100 },
    )
    .then(() => true)
    .catch(() => false);
  const skeletonMs = cleared ? Date.now() - started - 600 : null;
  await page
    .waitForFunction(() => Array.from(document.images).every((i) => i.complete || i.loading === 'lazy'), null, {
      timeout: 8000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(400);
  return skeletonMs;
}

/** What can be measured rather than eyeballed. */
async function measure(page: Page, narrow: boolean) {
  return page.evaluate((narrow) => {
    const root = document.documentElement;
    /*
     * Sideways scroll is read before anything is unrolled: <main> is its own
     * scroller, so content too wide for it scrolls inside <main> and never
     * reaches the document. Unrolling first would also change the answer — a
     * flex item that stops clipping stops being able to shrink.
     */
    const mainEl = document.querySelector('main');
    const overflowX = Math.max(
      root.scrollWidth - root.clientWidth,
      mainEl ? mainEl.scrollWidth - mainEl.clientWidth : 0,
    );
    /*
     * The shell is a fixed-height frame and <main> scrolls inside it, so the
     * document is never taller than the viewport. Unroll the frame — <main> and
     * every ancestor — so a full-page shot is the whole surface, and so content
     * wider than <main> spills into the document where overflowX can see it.
     */
    // Fixed layers parked below the fold (the More drawer, closed) would surface
    // once the page is taller than the viewport. They are not on screen; hide them.
    for (const el of Array.from(document.querySelectorAll('body *')) as HTMLElement[]) {
      if (getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().top >= window.innerHeight) {
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    }
    for (let el = document.querySelector('main') as HTMLElement | null; el && el !== root; el = el.parentElement) {
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('min-width', '0', 'important');
    }
    const text = document.body.innerText;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };

    // Colour is temporal: one red thing per screen. Count the outermost red regions.
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const resolve = (v: string) => {
      probe.style.color = `var(${v})`;
      return getComputedStyle(probe).color;
    };
    const reds = new Set([resolve('--key-now'), resolve('--signal')]);
    probe.remove();
    const redEls = Array.from(document.querySelectorAll('body *')).filter((el) => {
      if (!visible(el)) return false;
      const s = getComputedStyle(el);
      const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
      return reds.has(s.backgroundColor) || (ownText && reds.has(s.color)) || reds.has(s.borderTopColor);
    });
    const redRegions = redEls.filter((el) => !redEls.some((o) => o !== el && o.contains(el)));
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''} "${(el as HTMLElement).innerText?.trim().slice(0, 40) ?? ''}"`;

    // Anything a thumb reaches should be 44px. Only meaningful on a phone width.
    const small = narrow
      ? Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]'))
          .filter(visible)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.height < 44 || r.width < 44;
          })
      : [];

    const iconOnlyUnlabelled = Array.from(document.querySelectorAll('button, a[href]'))
      .filter(visible)
      .filter((el) => !(el as HTMLElement).innerText.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title'));

    return {
      overflowX,
      pageHeight: root.scrollHeight,
      loadingWords: (text.match(/\bloading\b[^\n]{0,40}/gi) ?? []).slice(0, 5),
      placeholderTimings: (text.match(/\b50\s*min/gi) ?? []).length,
      redRegions: redRegions.length,
      redSample: redRegions.slice(0, 6).map(describe),
      smallTargets: small.length,
      smallSample: small.slice(0, 8).map(describe),
      unlabelledIconButtons: iconOnlyUnlabelled.length,
      skeletonsLeft: document.querySelectorAll('.animate-pulse').length,
      headline: (document.querySelector('h1, h2') as HTMLElement | null)?.innerText.trim().slice(0, 80) ?? null,
    };
  }, narrow);
}

/** Attached before navigation, so an error thrown on first render is caught. */
function listen(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Refused requests are the point of the error/offline states, and the socket is never up.
    if (/Failed to load resource|socket\.io|ERR_/.test(t)) return;
    errors.push(t.slice(0, 200));
  });
  return errors;
}

async function shoot(page: Page, id: string, width: number, errors: string[], extra: Record<string, unknown>) {
  const facts = await measure(page, width <= 768);
  mkdirSync(join(OUT, 'shots'), { recursive: true });
  mkdirSync(join(OUT, 'facts'), { recursive: true });

  // Full page, but capped: 200 recipes on a phone is a five-figure-pixel strip.
  const height = Math.min(facts.pageHeight, 9000);
  await page.screenshot({
    path: join(OUT, 'shots', `${id}.png`),
    fullPage: true,
    clip: { x: 0, y: 0, width, height },
    animations: 'disabled',
    caret: 'hide',
  });
  writeFileSync(join(OUT, 'facts', `${id}.json`), JSON.stringify({ id, ...extra, ...facts, errors }, null, 2));
}

const THEMES = ['dark', 'light'] as const;
const DATASETS: DatasetName[] = ['empty', 'typical', 'overflowing'];

for (const surface of SURFACES) {
  test.describe(surface.name, () => {
    for (const theme of THEMES) {
      for (const data of DATASETS) {
        if (DATA_FREE.has(surface.name) && data !== 'typical') continue;
        test(`${theme} · ${data}`, async ({ page }, info) => {
          const id = resumable(`${surface.name}__${data}__${theme}__${info.project.name}`);
          const width = page.viewportSize()!.width;
          const errors = listen(page);
          await prepare(page, theme, 'loaded');
          await serve(page, data, 'loaded');
          await page.goto(surface.path(recipeIdFor(data)));
          const skeletonMs = await settle(page, 'loaded');
          await shoot(page, id, width, errors, {
            surface: surface.name, data, theme, state: 'loaded', width, skeletonMs,
          });
        });
      }
    }

    if (DATA_FREE.has(surface.name)) return;
    // States are a property of the network, not the theme: dark only, phone and desktop.
    for (const state of ['loading', 'error', 'offline'] as const) {
      test(`dark · typical · ${state}`, async ({ page }, info) => {
        test.skip(info.project.name === 'w768', 'states are shot at the phone and desktop widths');
        const id = resumable(`${surface.name}__typical-${state}__dark__${info.project.name}`);
        const width = page.viewportSize()!.width;
        const errors = listen(page);
        await prepare(page, 'dark', state);
        await serve(page, 'typical', state);
        await page.goto(surface.path(recipeIdFor('typical')));
        const skeletonMs = await settle(page, state);
        await shoot(page, id, width, errors, {
          surface: surface.name, data: 'typical', theme: 'dark', state, width, skeletonMs,
        });
      });
    }
  });
}
