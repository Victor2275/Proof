import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../lib/api';
import { repo } from '../lib/repo';
import { startActiveBake } from '../lib/activeBake';
import { makeBakeLog, makeNote, makePantryItem, makeRecipe, renderScreen, seed } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { getPublished: vi.fn(), getPublishedRecipe: vi.fn(), getMyPublications: vi.fn() },
}));

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

const render = (route = '/') =>
  renderScreen(
    <>
      <Dashboard />
      <Where />
    </>,
    { route },
  );

const RECIPES = [
  makeRecipe({
    _id: '1',
    title: 'Sourdough Bread',
    tags: ['bread'],
    folder: 'Breads',
    imageUrls: ['https://example.com/sourdough.jpg'],
    difficulty: 'Hard',
    ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }, { name: 'Water', quantity: 350, unit: 'g' }],
    createdAt: '2026-08-03T00:00:00.000Z',
  }),
  makeRecipe({
    _id: '2',
    title: 'Chocolate Chip Cookies',
    tags: ['dessert'],
    folder: 'Desserts',
    difficulty: 'Easy',
    ingredients: [{ name: 'Butter', quantity: 100, unit: 'g' }, { name: 'Chocolate chips', quantity: 200, unit: 'g' }],
    createdAt: '2026-08-02T00:00:00.000Z',
  }),
  makeRecipe({
    _id: '3',
    title: 'Apple Pie',
    folder: 'Desserts',
    difficulty: 'Medium',
    ingredients: [{ name: 'Bramley apples', quantity: 6, unit: '' }],
    createdAt: '2026-08-01T00:00:00.000Z',
  }),
];

const titles = (within_: HTMLElement) => within_.querySelectorAll('h3');
const allRecipes = () => screen.getByRole('heading', { name: /^(All recipes|Recipes)$/ }).closest('section')!;

beforeEach(async () => {
  localStorage.clear();
  await seed('recipes', RECIPES);
  vi.mocked(api.getPublished).mockResolvedValue({ items: [], total: 0, offset: 0, limit: 8 });
});

describe('the cookbook home', () => {
  it('puts search first, full width, with no unlabelled shuffle beside it', async () => {
    render();
    const search = await screen.findByRole('searchbox', { name: 'Search the cookbook' });
    await waitFor(() => expect(search).toHaveAttribute('placeholder', 'Search 3 recipes, ingredients, notes'));
    expect(screen.queryByRole('button', { name: 'Inspire me' })).not.toBeInTheDocument();
  });

  it('opens on the last bake, with its note to next time, and shows each recipe once above the grid', async () => {
    await seed('bakeLogs', [
      makeBakeLog({ _id: 'b1', recipeId: '1', date: '2026-10-20T00:00:00.000Z', rating: 4, nextTime: 'Cooler water.' }),
      makeBakeLog({ _id: 'b2', recipeId: '2', date: '2026-10-10T00:00:00.000Z' }),
      makeBakeLog({ _id: 'b3', recipeId: '1', date: '2026-10-01T00:00:00.000Z' }),
    ]);
    render();
    const resume = await screen.findByRole('link', { name: /^Pick up where you left off: Sourdough Bread/ });
    expect(resume).toHaveAttribute('href', '/recipe/1');
    expect(resume).toHaveAccessibleName(/Next time: Cooler water\./);
    const recent = screen.getByRole('heading', { name: 'Recently baked' }).closest('section')!;
    expect([...titles(recent)].map((h) => h.textContent)).toEqual(['Chocolate Chip Cookies']);
    expect(within(recent).getByRole('link', { name: /All bakes/ })).toHaveAttribute('href', '/bakes');
  });

  it('resumes a bake that is running instead', async () => {
    startActiveBake('2', 'Chocolate Chip Cookies', 1);
    render();
    expect(await screen.findByRole('link', { name: /^Resume baking: Chocolate Chip Cookies/ })).toHaveAttribute('href', '/recipe/2/bake');
  });

  it('says when a tile was baked and how it went, never an ingredient count', async () => {
    await seed('bakeLogs', [makeBakeLog({ recipeId: '3', date: new Date(Date.now() - 3 * 86_400_000).toISOString(), rating: 5, isPersonalBest: true })]);
    render();
    const pie = await within(await waitFor(allRecipes)).findByRole('link', { name: /Apple Pie/ });
    await waitFor(() => expect(pie).toHaveTextContent('Baked 3 days ago · ★5'));
    expect(within(pie).getByRole('img', { name: 'Personal best' })).toBeInTheDocument();
    expect(screen.queryByText(/ingredients$/)).not.toBeInTheDocument();
  });

  it('prints its contents as chapters with their counts, each opening the chapter', async () => {
    const user = userEvent.setup();
    render();
    const contents = (await screen.findByRole('heading', { name: 'Contents' })).closest('section')!;
    await user.click(within(contents).getByRole('link', { name: 'Desserts, 2 recipes' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?chapter=Desserts');
  });

  it('keeps small chapters and loose notes behind "Show more"', async () => {
    const user = userEvent.setup();
    await seed('notes', [makeNote()]);
    const many = Array.from({ length: 9 }, (_, i) => makeRecipe({ _id: `c${i}`, title: `R${i}`, folder: `Chapter ${i}` }));
    await seed('recipes', many);
    render();
    const more = await screen.findByRole('button', { name: /more chapters and loose notes/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(screen.getByRole('link', { name: 'Loose notes, 1 note' })).toHaveAttribute('href', '/notes');
  });

  it('switches the contents to an index A–Z, kept in the address, with a letter rail', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('radio', { name: 'A–Z' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?view=az');
    expect(document.getElementById('index-A')).toHaveTextContent('A1 recipe');
    const rail = screen.getByRole('navigation', { name: 'Jump to a letter' });
    expect(within(rail).getByRole('link', { name: 'S' })).toHaveAttribute('href', '#index-S');
    expect(within(rail).queryByRole('link', { name: 'Q' })).not.toBeInTheDocument();
  });
});

describe('a chapter', () => {
  it('opens as its own page, with back to the cookbook', async () => {
    render('/?chapter=Desserts');
    expect(await screen.findByRole('heading', { level: 1, name: 'Desserts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Cookbook' })).toHaveAttribute('href', '/');
    await waitFor(() => expect([...titles(allRecipes())].map((h) => h.textContent)).toEqual(['Chocolate Chip Cookies', 'Apple Pie']));
  });
});

describe('sorting and filtering', () => {
  it('sorts A–Z, and remembers it', async () => {
    const user = userEvent.setup();
    render();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Sort' }), 'az');
    expect([...titles(allRecipes())].map((h) => h.textContent)).toEqual(['Apple Pie', 'Chocolate Chip Cookies', 'Sourdough Bread']);
    expect(localStorage.getItem('proof.cookbookSort')).toBe('az');
  });

  it('puts unrated recipes after rated ones when sorting by rating', async () => {
    const user = userEvent.setup();
    await seed('bakeLogs', [makeBakeLog({ _id: 'x', recipeId: '3', rating: 3 }), makeBakeLog({ _id: 'y', recipeId: '2', rating: 5 })]);
    render();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Sort' }), 'rating');
    await waitFor(() =>
      expect([...titles(allRecipes())].map((h) => h.textContent)).toEqual(['Chocolate Chip Cookies', 'Apple Pie', 'Sourdough Bread']),
    );
  });

  it('filters by difficulty and by what has been baked, and says how many are shown', async () => {
    const user = userEvent.setup();
    await seed('bakeLogs', [makeBakeLog({ recipeId: '2' })]);
    render();
    await user.click(await screen.findByRole('button', { name: 'Filter' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filter' });
    await user.click(within(sheet).getByRole('radio', { name: 'Not yet' }));
    await user.click(within(sheet).getByRole('button', { name: 'Done' }));
    expect(screen.getByText(/2 of 3 shown/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter · 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('offers "Can make now" only once there is a cupboard, and keeps what it covers', async () => {
    const user = userEvent.setup();
    await seed('pantry', [makePantryItem({ name: 'Flour' }), makePantryItem({ _id: 'p2', name: 'Water' })]);
    render();
    await user.click(await screen.findByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('switch', { name: /Can make now/ }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    // The bread has everything; the cookies are two short; the pie is one short.
    await waitFor(() => expect(screen.getByText(/3 of 3 shown/)).toBeInTheDocument());
  });

  it('switches to a list of thumbnails with full titles', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('radio', { name: 'List' }));
    expect(within(allRecipes()).getByRole('link', { name: /Chocolate Chip Cookies/ })).toBeInTheDocument();
    expect(localStorage.getItem('proof.cookbookLayout')).toBe('list');
  });
});

describe('search', () => {
  it('finds recipes by an ingredient, and bakes by what their notes say', async () => {
    const user = userEvent.setup();
    await seed('bakeLogs', [makeBakeLog({ _id: 'n1', recipeId: '1', notes: 'Crumb too tight, more butter next time.' })]);
    render();
    await user.type(await screen.findByRole('searchbox', { name: 'Search the cookbook' }), 'butter');
    expect(await screen.findByText(/1 recipe · 1 in your bake notes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chocolate Chip Cookies/ })).toBeInTheDocument();
    const notes = screen.getByRole('heading', { name: 'In your bake notes' }).closest('section')!;
    expect(within(notes).getByRole('link', { name: /Sourdough Bread/ })).toHaveAttribute('href', '/recipe/1?makeId=n1');
  });

  it('says what the search missed, and offers to clear it', async () => {
    const user = userEvent.setup();
    render();
    await user.type(await screen.findByRole('searchbox', { name: 'Search the cookbook' }), 'zzzz');
    expect(await screen.findByText(/Nothing in the cookbook matches “zzzz”/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    expect(screen.getByRole('searchbox', { name: 'Search the cookbook' })).toHaveValue('');
  });

  it('offers a labelled "Surprise me" among the results', async () => {
    const user = userEvent.setup();
    render();
    await user.type(await screen.findByRole('searchbox', { name: 'Search the cookbook' }), 'e');
    await user.click(await screen.findByRole('button', { name: 'Surprise me from these' }));
    expect(screen.getByTestId('where').textContent).toMatch(/^\/recipe\//);
  });
});

describe('when the device will not cooperate', () => {
  it('names the failure, and offers a retry', async () => {
    vi.spyOn(repo, 'getRecipes').mockRejectedValueOnce(new Error('The database is blocked.'));
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('The database is blocked.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it("offers an empty cookbook the shared cookbook's starter shelf instead of an empty list", async () => {
    for (const r of RECIPES) await repo.deleteRecipe(r._id);
    render();
    expect(await screen.findByRole('heading', { name: 'Your cookbook is empty' })).toBeInTheDocument();
    const doors = screen.getByRole('navigation', { name: 'Ways to add a recipe' });
    expect(within(doors).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/new', '/new?start=paste', '/new?start=photo']);
    expect(screen.getByText(/Stored on this device/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Or start from one of these/i })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('0 recipes')).not.toBeInTheDocument();
  });
});
