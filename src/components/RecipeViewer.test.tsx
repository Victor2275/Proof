import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeViewer from './RecipeViewer';
import { api, ApiError } from '../lib/api';
import { repo } from '../lib/repo';
import type { PublishedRecipe } from '../lib/types';
import { makeBakeLog, makeRecipe, renderScreen, seed } from '../test/utils';

/*
 * The viewer's structure: the order a baker reads it in, and what stays put
 * when the view changes. The selected make has its own file.
 */

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, api: { getPublishedRecipe: vi.fn() } };
});

const RECIPE = makeRecipe({
  _id: 'r1',
  title: 'Country Sourdough',
  servings: 2,
  difficulty: 'Hard',
  prepTime: '45',
  cookTime: '40',
  ingredients: [{ name: 'Strong white flour', quantity: 900, unit: 'g' }],
  instructions: ['Feed the levain.', 'Bake.'],
  labNotes: 'Half the salt next time.',
});

const LOG = makeBakeLog({ _id: 'b1', recipeId: 'r1', date: '2026-08-09T17:41:22.000Z', notes: 'Crumb still tight.' });

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

const renderViewer = () => renderScreen(<RecipeViewer />, { route: '/recipe/r1', path: '/recipe/:id' });
const renderShared = () => renderScreen(<RecipeViewer />, { route: '/r/focaccia', path: '/r/:slug' });

beforeEach(async () => {
  await seed('recipes', [RECIPE]);
  await seed('bakeLogs', [LOG]);
});

describe('RecipeViewer — layout', () => {
  it('puts the title before any control that changes the recipe', async () => {
    renderViewer();
    const title = await screen.findByRole('heading', { level: 1, name: 'Country Sourdough' }, { timeout: 5000 });
    const view = screen.getByRole('group', { name: 'View' });
    const scale = screen.getByRole('group', { name: 'Scale recipe' });

    // DOM order is reading and focus order: title, then the view switch, then
    // the scale bank down with the ingredients it scales.
    expect(title.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.compareDocumentPosition(scale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the masthead when the view switches to previous makes', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });

    await user.click(await within(view).findByRole('button', { name: /Previous makes \(1\)/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'Country Sourdough' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Previous makes' })).toBeInTheDocument();
    // The recipe's own controls belong to the recipe view.
    expect(screen.queryByRole('group', { name: 'Scale recipe' })).not.toBeInTheDocument();
  });

  it('reads the lab notes with the ingredients, before the method', async () => {
    renderViewer();
    const notes = await screen.findByText('Half the salt next time.', undefined, { timeout: 5000 });
    const ingredients = screen.getByRole('heading', { name: 'Ingredients' });
    const method = screen.getByRole('heading', { name: 'Method' });

    expect(ingredients.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(method) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('RecipeViewer — paths that used to go nowhere', () => {
  it('opens the schedule from the previous makes view, in the recipe view', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });
    await user.click(await within(view).findByRole('button', { name: /Previous makes/ }));

    // The phone's Start key is the last control with that name.
    const starts = screen.getAllByRole('button', { name: 'Start recipe' });
    await user.click(starts[starts.length - 1]);
    const sheet = await screen.findByRole('dialog', { name: 'Start recipe' });
    await user.click(within(sheet).getByRole('button', { name: 'Schedule bake' }));

    expect(await screen.findByText(/Reverse bake schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Scale recipe' })).toBeInTheDocument();
  });

  it('reports a missing recipe with the way back, not a bare sentence', async () => {
    renderScreen(<RecipeViewer />, { route: '/recipe/gone', path: '/recipe/:id' });

    expect(
      await screen.findByRole('heading', { name: 'Nothing at this address' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the cookbook' })).toHaveAttribute('href', '/');
  });

  it('titles a make the way its tile does, and dates it without seconds', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });
    await user.click(await within(view).findByRole('button', { name: /Previous makes/ }));
    await user.click(await screen.findByRole('button', { name: /^Make 1,/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Make 1' });
    const baked = within(dialog).getByText('Baked').parentElement!;
    expect(baked.textContent).toMatch(/2026/);
    expect(baked.textContent).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});

describe('RecipeViewer — a recipe from the shared cookbook', () => {
  it('reads like the product, with whose it is and no owner controls (B4)', async () => {
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();

    expect(await screen.findByRole('heading', { level: 1, name: 'Focaccia' })).toBeInTheDocument();
    expect(screen.getByText(/Shared by @proof/)).toHaveTextContent('from TheMealDB');
    expect(screen.queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Favorite/ })).not.toBeInTheDocument();
  });

  it('saves an editable copy into the cookbook, remembering where it came from', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();

    await user.click(await screen.findByRole('button', { name: 'Save to my cookbook' }));

    await screen.findByTestId('elsewhere');
    const copy = (await repo.getRecipes()).find((r) => r.title === 'Focaccia');
    expect(copy?.forkedFrom).toEqual({ publishedId: 'p1', slug: 'focaccia', authorHandle: 'proof', title: 'Focaccia' });
    expect(copy?.instructions).toEqual(['Mix.', 'Bake.']);
  });

  it('offers the copy already saved rather than a second one', async () => {
    await seed('recipes', [
      makeRecipe({ _id: 'mine', title: 'Focaccia', forkedFrom: { publishedId: 'p1', slug: 'focaccia', authorHandle: 'proof', title: 'Focaccia' } }),
    ]);
    vi.mocked(api.getPublishedRecipe).mockResolvedValue(SHARED);
    renderShared();

    expect(await screen.findByRole('link', { name: 'Open my copy' })).toHaveAttribute('href', '/recipe/mine');
    expect(screen.queryByRole('button', { name: 'Save to my cookbook' })).not.toBeInTheDocument();
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
    expect(await screen.findByRole('link', { name: '@ada' })).toHaveAttribute('href', '/r/country-sourdough');
  });
});
