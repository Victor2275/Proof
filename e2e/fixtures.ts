import type { Page } from '@playwright/test';
import { seedDevice } from './seed';

/*
 * The library the baselines are taken against.
 *
 * Small, fixed, and shaped like the real thing rather than like a happy path:
 * one recipe that proves its phases (a levain, an autolyse, a bulk) and two
 * that can only manage the generic reading, placeholder timings on most of
 * them, and exactly two bake logs — because that is what the live database
 * looks like, and the surfaces are supposed to degrade honestly against it.
 */

const SOURDOUGH = {
  _id: 'r-sourdough',
  title: '72-Hour Sourdough',
  description: 'A long-fermented country loaf.',
  imageUrls: ['https://fixture.test/sourdough.jpg'],
  servings: 2,
  difficulty: 'Hard',
  prepTime: '45',
  cookTime: '40',
  tags: ['Bread', 'Sourdough'],
  folder: 'Breads',
  ingredients: [
    { name: 'Strong white flour', quantity: 900, unit: 'g' },
    { name: 'Water', quantity: 700, unit: 'g' },
    { name: 'Levain', quantity: 180, unit: 'g' },
    { name: 'Fine sea salt', quantity: 20, unit: 'g' },
  ],
  instructions: [
    'Feed the levain and leave it until it domes, about six hours.',
    'Autolyse the flour and water for one hour.',
    'Mix in the salt and the ripe levain.',
    'Bulk ferment for four hours, with a stretch and fold each hour.',
    'Shape into a boule and bench rest for twenty minutes.',
    'Proof in the banneton overnight in the fridge.',
    'Bake at 250C with steam for twenty minutes, then 230C for twenty more.',
    'Rest on a rack for at least two hours before cutting.',
  ],
  instructionLinks: [],
  labNotes: 'Half the salt next time.',
};

// The placeholder pair 199 of the 203 live recipes carry verbatim.
const PLACEHOLDER = { prepTime: '20 mins', cookTime: '30 mins' };

const CHEESECAKE = {
  _id: 'r-cheesecake',
  title: 'The Best Cheesecake',
  description: 'No water bath required.',
  imageUrls: ['https://fixture.test/cheesecake.jpg'],
  servings: 12,
  difficulty: 'Medium',
  ...PLACEHOLDER,
  tags: ['Dessert'],
  folder: 'Desserts',
  ingredients: [
    { name: 'Cream cheese', quantity: 900, unit: 'g' },
    { name: 'Caster sugar', quantity: 200, unit: 'g' },
  ],
  instructions: ['Beat the cream cheese and sugar.', 'Bake until barely set.'],
  instructionLinks: [],
  labNotes: '',
};

const STIR_FRY = {
  _id: 'r-stirfry',
  title: 'Prawn Stir-Fry',
  description: 'A quick Thai seafood dish.',
  imageUrls: ['https://fixture.test/stirfry.jpg'],
  servings: 4,
  difficulty: 'Easy',
  ...PLACEHOLDER,
  tags: ['Seafood', 'Thai'],
  folder: 'Mains',
  ingredients: [
    { name: 'King prawns', quantity: 400, unit: 'g' },
    { name: 'Ginger', quantity: 3, unit: 'cm piece' },
    { name: 'Lime', quantity: 1, unit: 'juice of' },
  ],
  instructions: ['Put the prawns in a bowl.', 'Heat the wok and fry for two minutes.'],
  instructionLinks: [],
  labNotes: '',
};

export const RECIPES = [SOURDOUGH, CHEESECAKE, STIR_FRY];

export const BAKE_LOGS = [
  {
    _id: 'b-1',
    recipeId: 'r-sourdough',
    date: '2026-08-09T09:00:00.000Z',
    notes: 'Crumb still tight. Push the bulk another hour.',
    images: [
      { url: 'https://fixture.test/crumb-1.jpg', label: 'Dough' },
      { url: 'https://fixture.test/crumb-2.jpg', label: 'Crumb' },
    ],
    imageUrls: [],
    isPersonalBest: true,
  },
  {
    _id: 'b-2',
    recipeId: 'r-cheesecake',
    date: '2026-09-05T09:00:00.000Z',
    notes: 'Cracked across the top. Lower the oven next time.',
    images: [],
    imageUrls: ['https://fixture.test/cheesecake-bake.jpg'],
    isPersonalBest: false,
  },
];

export const NOTES = [
  { _id: 'n-1', title: 'Starter timing', content: 'Fed at 0700. Doubled by 1130, so ~4.5h at 22C.' },
  { _id: 'n-2', title: 'Oven calibration', content: 'Runs 15C cold on the middle shelf.' },
];

export const PANTRY = [
  { _id: 'p-1', name: 'Strong white flour' },
  { _id: 'p-2', name: 'Fine sea salt' },
];

/**
 * A flat grey square. Every photograph in the app resolves to this, so the
 * plates are filled and the layout is captured exactly as in production,
 * without the baselines depending on an external CDN being up or on what it
 * serves today.
 *
 * Deliberately flat rather than a scaled-up thumbnail: this world bans
 * gradients and scrims over a photograph, and a fixture that already looks like
 * a gradient would hide the day somebody adds one.
 */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR42mPoaqvDihiGlgQA5AJjgRMkCsUAAAAASUVORK5CYII=',
  'base64',
);

/** Two recipes in the shared cookbook, for the starter shelf and /r/:slug. */
export const PUBLISHED = [SOURDOUGH, STIR_FRY].map((r, i) => ({
  ...r,
  _id: `pub-${r._id}`,
  slug: i === 0 ? '72-hour-sourdough' : 'prawn-stir-fry',
  authorHandle: 'proof',
  sourceAttribution: i === 1 ? 'TheMealDB' : '',
  featured: true,
  publishedAt: '2026-08-01T00:00:00.000Z',
}));

/**
 * Pins the whole environment: the cookbook on the device, the API, every
 * photograph, and the clock.
 *
 * The clock matters because several surfaces print relative dates — "2d ago"
 * on the dashboard's recently-baked shelf — which would make a baseline fail
 * every day at midnight.
 */
export async function pinEnvironment(page: Page, { emptyCookbook = false } = {}) {
  await page.clock.setFixedTime(new Date('2026-09-18T12:00:00.000Z'));
  if (!emptyCookbook) {
    await seedDevice(page, { recipes: RECIPES, bakeLogs: BAKE_LOGS, notes: NOTES, pantry: PANTRY });
  }

  await page.route('**/fixture.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );

  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api/, '');

    if (path === '/published') {
      return route.fulfill(json({ items: PUBLISHED, total: PUBLISHED.length, offset: 0, limit: 8 }));
    }
    if (path === '/published/index') return route.fulfill(json({ items: PUBLISHED }));
    if (/^\/published\/[^/]+\/comments$/.test(path)) return route.fulfill(json({ items: [] }));
    if (path === '/profiles/proof') {
      return route.fulfill(
        json({
          profile: { handle: 'proof', displayName: 'Proof', bio: 'The library this cookbook started from.', pro: false, joinedAt: null },
          recipes: PUBLISHED,
          stats: { published: PUBLISHED.length, baked: 0 },
        }),
      );
    }
    if (path.startsWith('/published/')) {
      const key = path.split('/')[2];
      const recipe = PUBLISHED.find((p) => p.slug === key || p._id === key);
      return recipe
        ? route.fulfill(json(recipe))
        : route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Not in the shared cookbook."}' });
    }
    if (path === '/health') return route.fulfill(json({ status: 'ok', database: 'connected' }));
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Not found"}' });
  });
}

/** Light is the faceplate inverted, and is a first-class theme, so it is shot too. */
export async function useTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
    // Otherwise the landing page intercepts every first navigation.
    window.localStorage.setItem('hasVisited', 'true');
  }, theme);
}
