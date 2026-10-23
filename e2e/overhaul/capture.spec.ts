import { test, type Page, type Route } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset, publishedFrom } from '../audit/datasets';
import { seedDevice } from '../seed';

/*
 * The UI-overhaul review set: one focused pass of screenshots that every
 * reviewer reads, so their findings are comparable. Two people, not a matrix:
 *
 *   stranger  — nothing on the device, arriving at the landing page.
 *   regular   — the live library plus a believable bake history, so the
 *               iteration surfaces have something to show.
 *
 * Each shot is taken twice: the first screen ("fold") and the page down to a
 * capped height ("page"). Shots land in audit-shots/overhaul/<label>/.
 */

const LABEL = process.env.OVERHAUL_LABEL ?? 'before';
const OUT = join(process.cwd(), 'audit-shots', 'overhaul', LABEL);
const PAGE_CAP = 3200;

const typical = dataset('typical');
const shared = publishedFrom(typical.recipes);

/** Recipes that have photographs and real-looking content, for the bake history. */
const featured = typical.recipes.filter((r) => Array.isArray(r.imageUrls) && (r.imageUrls as string[]).length).slice(0, 6);
const NOTES = [
  'Bulk ran warm (26C) — over-proofed slightly, crumb open but flat. Next: cooler water.',
  'Cut hydration to 72%. Much better shape, ear on two loaves.',
  'Swapped 10% for rye. Flavour deeper, a touch dense. Keep.',
  'Personal best — even crumb, crackling crust. Baked 20 min lid on, 22 off.',
  'Rushed the preshape. Spread in the oven.',
  'Tried a longer cold retard (16h). Sourer, blistered crust.',
];
const bakeLogs = Array.from({ length: 14 }, (_, i) => {
  const r = featured[i % 3];
  const photo = (r.imageUrls as string[])[0];
  return {
    _id: `b-regular-${i}`,
    recipeId: { _id: r._id, title: r.title },
    date: new Date(Date.UTC(2026, 9, 18) - i * 86_400_000 * 4).toISOString(),
    notes: NOTES[i % NOTES.length],
    images: i % 2 ? [] : [{ url: photo, label: 'Crumb' }],
    imageUrls: [],
    rating: 3 + (i % 3),
    isPersonalBest: i === 3,
  };
});
const regular = { ...typical, bakelogs: [...typical.bakelogs, ...bakeLogs] };
const regularRecipeId = String(featured[0]._id);

/** `visited`: the stranger has already come through the landing page and its welcome. */
async function serve(page: Page, who: 'stranger' | 'regular', theme: 'dark' | 'light', visited = who === 'regular') {
  const data = who === 'stranger' ? { recipes: [], bakelogs: [], notes: [], pantry: [] } : regular;
  await seedDevice(page, { recipes: data.recipes, bakeLogs: data.bakelogs, notes: data.notes, pantry: data.pantry });
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
  await page.route('**/socket.io/**', (route) => route.abort('connectionrefused'));

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.replace(/^.*\/api/, '').split('/').filter(Boolean);
    if (parts[0] === 'published' && parts.length === 1) {
      const items = url.searchParams.get('featured') ? shared.filter((p) => p.featured) : shared;
      return json(route, { items, total: items.length, offset: 0, limit: items.length });
    }
    if (parts[0] === 'published' && parts[1] === 'index') return json(route, { items: shared });
    if (parts[0] === 'published' && parts[2] === 'comments') return json(route, { items: [] });
    if (parts[0] === 'published') {
      const recipe = shared.find((p) => p.slug === parts[1] || p._id === parts[1]);
      return recipe ? json(route, recipe) : json(route, { error: 'Not in the shared cookbook.' }, 404);
    }
    if (parts[0] === 'profiles') {
      return json(route, {
        profile: { handle: 'proof', displayName: 'Proof Kitchen', bio: 'The house cookbook.', pro: false, joinedAt: '2026-08-01T00:00:00.000Z' },
        recipes: shared.slice(0, 12),
        stats: { published: 12, baked: 40 },
      });
    }
    if (parts[0] === 'health') return json(route, { status: 'ok', database: 'connected' });
    if (parts[0] === 'auth') return json(route, { error: 'Not signed in' }, 401);
    return json(route, { error: 'Not found' }, 404);
  });
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
}

async function shoot(page: Page, name: string, width: string) {
  mkdirSync(OUT, { recursive: true });
  const file = (kind: string) => join(OUT, `${name}__${width}__${kind}.png`);
  await page.screenshot({ path: file('fold'), animations: 'disabled' });
  // The app shell scrolls inside <main>, not the document; let the document grow so the page shot sees it all.
  await page.addStyleTag({
    content: '.h-screen{height:auto!important;overflow:visible!important} main{overflow:visible!important}',
  });
  await page.waitForTimeout(300);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vw = page.viewportSize()!.width;
  await page.screenshot({
    path: file('page'),
    fullPage: true,
    clip: { x: 0, y: 0, width: vw, height: Math.min(height, PAGE_CAP) },
    animations: 'disabled',
  });
  const text = await page.evaluate(() => (document.querySelector('main') ?? document.body).innerText.slice(0, 4000));
  writeFileSync(join(OUT, `${name}__${width}__text.txt`), text);
}

const slug = shared[0].slug;

type Shot = { name: string; who: 'stranger' | 'regular'; path: string; themes: ('dark' | 'light')[]; visited?: boolean };
/*
 * Light (paper) is the default theme since Phase 1, so every screen is shot in
 * both. The paths are the four destinations' own since Phase 2; the names keep
 * their numbers so sets from different phases line up.
 */
const BOTH: ('dark' | 'light')[] = ['light', 'dark'];
const SHOTS: Shot[] = [
  { name: 'stranger-01-landing', who: 'stranger', path: '/welcome', themes: BOTH },
  { name: 'stranger-03-empty-cookbook', who: 'stranger', path: '/', themes: BOTH, visited: true },
  { name: 'stranger-04-discover', who: 'stranger', path: '/discover', themes: BOTH, visited: true },
  { name: 'stranger-05-shared-recipe-link', who: 'stranger', path: `/r/${slug}`, themes: BOTH },
  { name: 'stranger-06-profile', who: 'stranger', path: '/@proof', themes: BOTH },
  { name: 'regular-01-dashboard', who: 'regular', path: '/', themes: BOTH },
  { name: 'regular-02-recipe', who: 'regular', path: `/recipe/${regularRecipeId}`, themes: BOTH },
  { name: 'regular-03-baking-mode', who: 'regular', path: `/recipe/${regularRecipeId}/bake`, themes: BOTH },
  { name: 'regular-04-editor', who: 'regular', path: `/edit/${regularRecipeId}`, themes: BOTH },
  { name: 'regular-05-new-recipe', who: 'regular', path: '/new', themes: BOTH },
  { name: 'regular-06-gallery', who: 'regular', path: '/bakes', themes: BOTH },
  { name: 'regular-07-bakes-by-recipe', who: 'regular', path: '/bakes?view=recipe', themes: BOTH },
  { name: 'regular-17-cookbook-index', who: 'regular', path: '/?view=az', themes: BOTH },
  { name: 'regular-18-chapter', who: 'regular', path: '/?chapter=Dessert', themes: BOTH },
  { name: 'regular-08-pantry', who: 'regular', path: '/shop?view=cupboard', themes: BOTH },
  { name: 'regular-09-grocery', who: 'regular', path: '/shop', themes: BOTH },
  { name: 'regular-10-notes', who: 'regular', path: '/notes', themes: BOTH },
  { name: 'regular-11-settings', who: 'regular', path: '/settings', themes: BOTH },
  { name: 'regular-12-discover', who: 'regular', path: '/discover', themes: BOTH },
  { name: 'regular-13-not-found', who: 'regular', path: '/no-such-page', themes: BOTH },
];

for (const shot of SHOTS) {
  for (const theme of shot.themes) {
    test(`${shot.name} ${theme}`, async ({ page }, info) => {
      await serve(page, shot.who, theme, shot.visited ?? shot.who === 'regular');
      await page.goto(shot.path);
      await settle(page);
      await shoot(page, `${shot.name}__${theme}`, info.project.name);
    });
  }
}

test('stranger-02-onboarding dark', async ({ page }, info) => {
  await serve(page, 'stranger', 'dark');
  await page.goto('/');
  await page.waitForURL('**/welcome');
  await page.getByRole('button', { name: /Open the cookbook/i }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.getByRole('dialog').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  await settle(page);
  await shoot(page, 'stranger-02-onboarding__dark', info.project.name);
});

/* The shell's own states: the avatar's entries, New's ways in, and a bake left running. */
for (const theme of BOTH) {
  test(`regular-14-avatar ${theme}`, async ({ page }, info) => {
    await serve(page, 'regular', theme);
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'Your account and settings' }).filter({ visible: true }).first().click();
    await page.waitForTimeout(600);
    await shoot(page, `regular-14-avatar__${theme}`, info.project.name);
  });

  test(`regular-15-new-sheet ${theme}`, async ({ page }, info) => {
    await serve(page, 'regular', theme);
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'New', exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(600);
    await shoot(page, `regular-15-new-sheet__${theme}`, info.project.name);
  });

  test(`regular-16-timer-pill ${theme}`, async ({ page }, info) => {
    await serve(page, 'regular', theme);
    await page.addInitScript(
      ({ id, title }) => {
        localStorage.setItem('activeBake', JSON.stringify({ recipeId: id, recipeTitle: title, stepIndex: 2, startedAt: new Date().toISOString() }));
        localStorage.setItem(
          'proof.timers',
          JSON.stringify([{ id: 't1', name: 'Oven', endTime: Date.now() + 12 * 60_000 + 4000, remainingMs: 0, hasRung: false }]),
        );
      },
      { id: regularRecipeId, title: String(featured[0].title) },
    );
    await page.goto('/bakes');
    await settle(page);
    await shoot(page, `regular-16-timer-pill__${theme}`, info.project.name);
  });
}
