import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeViewer from './RecipeViewer';
import { ToastProvider } from './ui';
import { api, ApiError } from '../lib/api';
import { repo } from '../lib/repo';
import type { PublishedRecipe } from '../lib/types';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { makeBakeLog, makeRecipe, renderScreen, seed, testQueryClient } from '../test/utils';

/*
 * The recipe page (UI overhaul Phase 3): its reading order, the bake log on
 * the page, and the shared variant whose one action is to save it.
 */

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, api: { getPublishedRecipe: vi.fn(), countSave: vi.fn().mockResolvedValue({ ok: true }) } };
});

const RECIPE = makeRecipe({
  _id: 'r1',
  title: 'Cheesecake',
  description: 'The creamiest one. Be sure to check out my video below the recipe!',
  servings: 12,
  difficulty: 'Medium',
  prepTime: '20',
  cookTime: '75',
  folder: 'Dessert',
  sourceUrl: 'https://www.sugarspunrun.com/cheesecake',
  ingredients: [
    { name: 'graham cracker crumbs (170g)', quantity: 1, unit: 'cup' },
    { name: 'sour cream', quantity: 0.6666, unit: 'cup' },
  ],
  instructions: ['--- Crust ---', 'Press the crumbs into the tin.', '--- Cheesecake ---', 'Bake for 50–60 minutes.'],
});

const OLD = makeBakeLog({ _id: 'b1', recipeId: 'r1', date: '2026-09-23T10:00:00.000Z', notes: 'Cracked down the middle.', rating: 3 });
const LAST = makeBakeLog({
  _id: 'b2',
  recipeId: 'r1',
  date: '2026-10-17T10:00:00.000Z',
  notes: 'Pulled at 55 minutes.\nNo cracks.',
  rating: 4,
  nextTime: 'Leave it in the oven 10 minutes longer.',
  isPersonalBest: true,
  stepNotes: [{ stepIndex: 3, text: 'Pulled at 55 min. Perfect.', at: '2026-10-17T11:00:00.000Z' }],
});

const SHARED: PublishedRecipe = {
  _id: 'p1',
  slug: 'focaccia',
  title: 'Focaccia',
  description: '',
  imageUrls: [],
  servings: 8,
  difficulty: 'Easy',
  prepTime: '20',
  cookTime: '25',
  tags: [],
  folder: 'Breads',
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
  instructions: ['Mix.', 'Bake.'],
  authorHandle: 'proof',
  sourceAttribution: 'TheMealDB',
  publishedAt: '2026-08-01T00:00:00.000Z',
};

// The toasts live above the routes, as they do in the app, so Undo outlives a page that navigated away.
const renderViewer = (route = '/recipe/r1') =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeViewer />} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
const renderShared = () => renderScreen(<RecipeViewer />, { route: '/r/focaccia', path: '/r/:slug' });

beforeEach(async () => {
  await seed('recipes', [RECIPE]);
  await seed('bakeLogs', [OLD, LAST]);
});

describe('the recipe page, in reading order', () => {
  it('reads title, facts, last time, Start cooking, ingredients, method, then the bakes', async () => {
    renderViewer();
    const title = await screen.findByRole('heading', { level: 1, name: 'Cheesecake' });
    const order = [
      title,
      screen.getByText('Serves 12 · Prep 20 min · Cook 1 h 15 · Medium'),
      await screen.findByRole('link', { name: /^Last time/ }),
      screen.getAllByRole('link', { name: 'Start cooking' })[0],
      screen.getByRole('heading', { name: 'Ingredients' }),
      screen.getByRole('heading', { name: 'Method' }),
      screen.getByRole('heading', { name: 'Your bakes' }),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("drops the blog's aside from the headnote", async () => {
    renderViewer();
    expect(await screen.findByText('The creamiest one.')).toBeInTheDocument();
    expect(screen.queryByText(/check out my video/)).not.toBeInTheDocument();
  });

  it('hides the import placeholder times and offers to add real ones', async () => {
    await seed('recipes', [{ ...RECIPE, prepTime: '20 mins', cookTime: '30 mins' }]);
    renderViewer();
    expect(await screen.findByText(/Serves 12 · Medium/)).toBeInTheDocument();
    expect(screen.queryByText(/50 min|30 min/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add times/ })).toHaveAttribute('href', '/edit/r1');
  });

  it('credits the source as a quiet line that opens it in a new tab', async () => {
    renderViewer();
    const credit = await screen.findByRole('link', { name: 'Adapted from sugarspunrun.com, opens in a new tab' });
    expect(credit).toHaveAttribute('href', 'https://www.sugarspunrun.com/cheesecake');
    expect(credit).toHaveAttribute('target', '_blank');
  });

  it('says where it stands with the shared cookbook as a chip that opens publishing', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: /Private · this device/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('goes back to its chapter, by name', async () => {
    renderViewer();
    expect(await screen.findByRole('link', { name: 'Back to Dessert' })).toHaveAttribute('href', '/?chapter=Dessert');
  });
});

describe('the bake log, on the recipe', () => {
  it('shows last time: the date, the stars, the first line, and the note to this attempt', async () => {
    renderViewer();
    const card = await screen.findByRole('link', { name: /^Last time/ });
    expect(card).toHaveAttribute('href', '/bakes?recipe=r1');
    expect(card).toHaveTextContent('Last time · Oct 17');
    expect(card).toHaveTextContent('“Pulled at 55 minutes.”');
    expect(card).toHaveTextContent('Next time: Leave it in the oven 10 minutes longer.');
    expect(card).toHaveTextContent('2 bakes');
    expect(within(card).getByRole('img', { name: '4 of 5 stars' })).toBeInTheDocument();
  });

  it('runs the bakes oldest to newest, a photo-less bake as a note card, the best one stamped', async () => {
    renderViewer();
    const strip = (await screen.findByRole('heading', { name: 'Your bakes' })).closest('section')!;
    const bakes = await within(strip).findAllByRole('button', { name: /^Bake \d/ });
    expect(bakes.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Bake 1, Sep 23, 3 of 5 stars',
      'Bake 2, Oct 17, 4 of 5 stars, personal best',
    ]);
    expect(bakes[0]).toHaveTextContent('“Cracked down the middle.”');
    expect(within(strip).getAllByRole('img', { name: 'Personal best' })).toHaveLength(1);
  });

  it('pencils the last note about a step beside that step', async () => {
    renderViewer();
    const step = (await screen.findByText(/Step 2\./)).closest('li')!;
    await waitFor(() => expect(step).toHaveTextContent(/Oct 17/));
    expect(step).toHaveTextContent('Oct 17: Pulled at 55 min. Perfect.');
  });

  it('logs a bake from the page, without going through baking mode', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click((await screen.findAllByRole('button', { name: 'Log a bake' }))[0]);
    const sheet = await screen.findByRole('dialog', { name: 'How did it go?' });
    await user.click(within(sheet).getByRole('radio', { name: '5 stars' }));
    await user.type(within(sheet).getByRole('textbox', { name: 'What happened' }), 'Best one yet.');
    await user.type(within(sheet).getByRole('textbox', { name: 'Next time' }), 'Same again.');
    await user.click(screen.getByRole('button', { name: 'Log this bake' }));
    await waitFor(async () => expect(await repo.getRecipeBakeLogs('r1')).toHaveLength(3));
    const [logged] = await repo.getRecipeBakeLogs('r1');
    expect(logged).toMatchObject({ rating: 5, notes: 'Best one yet.', nextTime: 'Same again.' });
    expect(await screen.findByText('Bake logged')).toBeInTheDocument();
  });

  it('opens a bake, and deletes it at once with Undo', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: /^Bake 1,/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Bake 1' });
    expect(sheet).toHaveTextContent('Cracked down the middle.');
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    await waitFor(async () => expect(await repo.getRecipeBakeLogs('r1')).toHaveLength(1));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getRecipeBakeLogs('r1')).toHaveLength(2));
  });

  it('opens the bake an address names', async () => {
    renderViewer('/recipe/r1?makeId=b2');
    expect(await screen.findByRole('dialog', { name: 'Bake 2' })).toHaveTextContent('Leave it in the oven 10 minutes longer.');
  });

  it('keeps one personal best: marking another unmarks the first', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: /^Bake 1,/ }));
    await user.click(await screen.findByRole('button', { name: 'Mark as my best' }));
    await waitFor(async () => {
      const logs = await repo.getRecipeBakeLogs('r1');
      expect(logs.filter((l) => l.isPersonalBest).map((l) => l._id)).toEqual(['b1']);
    });
  });
});

describe('the toolbar', () => {
  it('favourites with a heart that says whether it is on', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: 'Add to favourites' }));
    await waitFor(async () => expect((await repo.getRecipe('r1'))?.tags).toContain('Favorite'));
    expect(await screen.findByRole('button', { name: 'Favourite' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shares through the system sheet, or its own when there is none, saying a private recipe has no link', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: 'Share' }));
    const sheet = await screen.findByRole('dialog', { name: 'Share Cheesecake' });
    expect(sheet).toHaveTextContent('Private · only on this device, so it has no link.');
    expect(within(sheet).queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  it('uses the system share sheet where there is one', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderViewer();
    await user.click(await screen.findByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cheesecake' }));
    expect(screen.queryByRole('dialog', { name: 'Share Cheesecake' })).not.toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'share');
  });

  it('deletes the recipe from the menu at once, with Undo', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(await screen.findByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(async () => expect(await repo.getRecipe('r1')).toBeNull());
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getRecipe('r1')).not.toBeNull());
  });
});

describe('a recipe from the shared cookbook', () => {
  it('reads like the product, with whose it is and no owner controls (B4)', async () => {
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();
    expect(await screen.findByRole('heading', { level: 1, name: 'Focaccia' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shared by @proof' })).toHaveAttribute('href', '/@proof');
    expect(screen.getByText('From TheMealDB')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /favourite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Start cooking' })).not.toBeInTheDocument();
  });

  it('has one primary action, under the title: save it', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();
    await user.click(await screen.findByRole('button', { name: 'Save to my cookbook' }));
    await screen.findByTestId('elsewhere');
    const copy = (await repo.getRecipes()).find((r) => r.title === 'Focaccia');
    expect(copy?.forkedFrom).toEqual({ publishedId: 'p1', slug: 'focaccia', authorHandle: 'proof', title: 'Focaccia' });
    expect(api.countSave).toHaveBeenCalledWith('p1');
  });

  it('offers the copy already saved rather than a second one', async () => {
    await seed('recipes', [
      makeRecipe({ _id: 'mine', title: 'Focaccia', forkedFrom: { publishedId: 'p1', slug: 'focaccia', authorHandle: 'proof', title: 'Focaccia' } }),
    ]);
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();
    expect(await screen.findByRole('link', { name: 'Open my copy' })).toHaveAttribute('href', '/recipe/mine');
  });

  it('treats an unpublished recipe as a page that no longer exists', async () => {
    vi.mocked(api.getPublishedRecipe).mockRejectedValue(new ApiError('Not in the shared cookbook.', 404));
    renderShared();
    expect(await screen.findByRole('heading', { name: 'Nothing at this address' })).toBeInTheDocument();
  });

  it('names an unreachable server as such, with a retry', async () => {
    vi.mocked(api.getPublishedRecipe).mockRejectedValue(new ApiError("Can't reach the server.", 0));
    renderShared();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Can't reach the server/), { timeout: 4000 });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('credits the original on a saved copy, linking to it', async () => {
    await seed('recipes', [
      makeRecipe({ _id: 'r1', title: 'Country Sourdough', forkedFrom: { publishedId: 'p9', slug: 'country-sourdough', authorHandle: 'ada', title: 'Country Sourdough' } }),
    ]);
    renderViewer();
    expect(await screen.findByRole('link', { name: 'Adapted from @ada' })).toHaveAttribute('href', '/r/country-sourdough');
  });
});

describe('the docked Start cooking bar', () => {
  it('stays out of reach until the page Start cooking scrolls away', async () => {
    renderViewer();
    await screen.findByRole('heading', { level: 1, name: 'Cheesecake' });
    // Without an observer (jsdom) the bar never shows, and is not reachable.
    const docked = screen.getAllByText('Start cooking').find((el) => el.closest('[inert]'));
    expect(docked).toBeTruthy();
    fireEvent.scroll(window);
  });
});
