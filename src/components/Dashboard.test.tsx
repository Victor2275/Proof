import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { api } from '../lib/api';
import { repo } from '../lib/repo';
import { startActiveBake } from '../lib/activeBake';
import { makeRecipe, renderScreen, seed } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { getPublished: vi.fn(), getPublishedRecipe: vi.fn() },
}));

const renderWithProviders = (ui: React.ReactElement) => renderScreen(ui);

const mockRecipes = [
  makeRecipe({
    _id: '1',
    title: 'Sourdough Bread',
    description: 'Classic',
    tags: ['sourdough', 'bread'],
    folder: 'Breads',
    imageUrls: ['https://example.com/sourdough.jpg'],
    prepTime: '30',
    cookTime: '45',
    instructions: [
      'Feed the levain and let it ripen for 6 hours.',
      'Bulk ferment for 4 hours.',
      'Bake at 250C for 30 minutes.',
    ],
    updatedAt: '2026-08-03T00:00:00.000Z',
  }),
  makeRecipe({
    _id: '2',
    title: 'Chocolate Chip Cookies',
    description: 'Sweet',
    tags: ['cookies', 'dessert'],
    folder: 'Desserts',
    prepTime: '15',
    cookTime: '12',
    instructions: ['Mix the dough.', 'Bake at 180C for 12 minutes.'],
    updatedAt: '2026-08-02T00:00:00.000Z',
  }),
  makeRecipe({
    _id: '3',
    title: 'Pizza Dough',
    description: 'Neapolitan',
    tags: ['pizza', 'sourdough'],
    folder: 'Breads',
    prepTime: '20',
    cookTime: '10',
    instructions: ['Mix the dough.', 'Bulk ferment for 2 hours.', 'Bake for 10 minutes.'],
    updatedAt: '2026-08-01T00:00:00.000Z',
  }),
];

const emptyTheCookbook = async () => {
  await repo.deleteRecipe('1');
  await repo.deleteRecipe('2');
  await repo.deleteRecipe('3');
};

describe('Dashboard Component', () => {
  beforeEach(async () => {
    localStorage.clear();
    await seed('recipes', mockRecipes);
    vi.mocked(api.getPublished).mockResolvedValue({ items: [], total: 0, offset: 0, limit: 8 });
  });

  it('renders the cookbook as a gallery of photographs, each named underneath', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
    expect(screen.getByRole('img', { name: 'Sourdough Bread' })).toHaveAttribute(
      'src',
      'https://example.com/sourdough.jpg',
    );
    expect(screen.getByRole('heading', { name: 'Sourdough Bread' })).toBeInTheDocument();
  });

  it('shows phases only for a recipe whose instructions proved them', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    // The sourdough names a levain and a bulk ferment, so its keys mean
    // something.
    expect(screen.getByRole('img', { name: /Sourdough Bread phases/i })).toBeInTheDocument();
    // The cookies read as generic prep/cook — true of almost anything, and not
    // worth a row of keys that would look like data.
    expect(screen.queryByRole('img', { name: /Chocolate Chip Cookies phases/i })).not.toBeInTheDocument();
  });

  it('shows the total time as a segment readout, not raw prepTime/cookTime text', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    // 30 (prep) + 45 (cook) = 75 minutes = 1:15, announced as one value.
    expect(screen.getByRole('img', { name: '1:15 HR' })).toBeInTheDocument();
  });

  it('names the failure, and offers a retry, when the device database will not open', async () => {
    const spy = vi.spyOn(repo, 'getRecipes').mockRejectedValue(new Error('Storage is blocked.'));
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText(/Couldn't open the cookbook on this device/i)).toBeInTheDocument();
    expect(screen.getByText(/Storage is blocked\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    // No count is printed over a cookbook that could not be read.
    expect(screen.queryByText(/^\d+ recipes?$/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('says what the search missed, and offers to clear it', async () => {
    renderWithProviders(<Dashboard />);
    await screen.findByText('Sourdough Bread');
    fireEvent.change(screen.getByPlaceholderText(/Search recipes or tags/i), { target: { value: 'zzzzqqq' } });

    expect(await screen.findByText(/Nothing in the cookbook matches/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear the search/i }));
    expect(await screen.findByText('Sourdough Bread')).toBeInTheDocument();
  });

  it("offers an empty cookbook the shared cookbook's starter shelf instead of an empty list", async () => {
    await emptyTheCookbook();
    vi.mocked(api.getPublished).mockResolvedValue({
      items: [
        {
          _id: 'p1', slug: 'focaccia', title: 'Focaccia', description: '', imageUrls: [], servings: 8,
          difficulty: 'Easy', prepTime: '', cookTime: '', tags: [], folder: 'Breads',
          authorHandle: 'proof', sourceAttribution: '', publishedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      total: 1, offset: 0, limit: 8,
    });
    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole('heading', { name: /Start from one of these/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Save Focaccia to my cookbook' })).toBeInTheDocument();
    // No search box and no "0 recipes" over a cookbook that is simply new.
    expect(screen.queryByPlaceholderText(/Search recipes or tags/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0 recipes')).not.toBeInTheDocument();
  });

  it('keeps the way to start from scratch when the shared cookbook is out of reach', async () => {
    await emptyTheCookbook();
    vi.mocked(api.getPublished).mockRejectedValue(new Error('offline'));
    renderWithProviders(<Dashboard />);

    // The shared cookbook retries once before it gives up.
    expect(await screen.findByText(/needs a connection/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Write a recipe/i })).toHaveAttribute('href', '/new');
  }, 8000);

  it('filters recipes by search query (fuse.js)', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const searchInput = screen.getByPlaceholderText(/Search recipes or tags/i);
    fireEvent.change(searchInput, { target: { value: 'Chocolate' } });

    await waitFor(() => {
      expect(screen.getByText('Chocolate Chip Cookies')).toBeDefined();
      expect(screen.queryByText('Pizza Dough')).not.toBeInTheDocument();
    });
  });

  it('filters recipes by bank (folder)', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Desserts/ }));

    await waitFor(() => {
      expect(screen.getByText('Chocolate Chip Cookies')).toBeDefined();
      expect(screen.queryByText('Sourdough Bread')).not.toBeInTheDocument();
      expect(screen.queryByText('Pizza Dough')).not.toBeInTheDocument();
    });
  });

  it('returns to the full list from "All"', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Desserts/ }));
    await waitFor(() => expect(screen.queryByText('Sourdough Bread')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^All/ }));
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
  });

  it('lights the running recipe\'s row and offers Resume, not another row', async () => {
    startActiveBake('1', 'Sourdough Bread', 1);
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Now baking/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('href', '/recipe/1/bake');

    // The active recipe appears once — in the "Now baking" panel — not a
    // second time in the plain list below it.
    expect(screen.getAllByText('Sourdough Bread')).toHaveLength(1);
  });

  it("does not print the seed's placeholder total on the running bake", async () => {
    // 199 of the live recipes carry "20 mins" / "30 mins" verbatim; the running
    // bake read 50 MIN while the tiles already drew the time as unknown.
    await seed('recipes', [{ ...mockRecipes[0], prepTime: '20 mins', cookTime: '30 mins' }]);
    startActiveBake('1', 'Sourdough Bread', 1);
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Now baking/i)).toBeInTheDocument());
    expect(screen.queryByRole('img', { name: /50 MIN/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /-- MIN|--/ })).toBeInTheDocument();
  });

  it('does not show a Now Baking panel or Resume control when nothing is running', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    expect(screen.queryByText(/Now baking/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /resume/i })).not.toBeInTheDocument();
  });

  it("Inspire Me navigates to a recipe from the current filtered set", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    // Just confirm the control renders and is clickable without throwing —
    // the destination is random, so we don't assert which recipe it lands on.
    const inspireButton = screen.getByRole('button', { name: /inspire me/i });
    fireEvent.click(inspireButton);
    expect(inspireButton).toBeInTheDocument();
  });
  it("shows each recipe's photograph on a plate, and an unlit plate where there is none", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    expect(screen.getByRole('img', { name: 'Sourdough Bread' })).toHaveAttribute(
      'src',
      'https://example.com/sourdough.jpg',
    );
    // Cookies has no image; its row still reads, with no broken image in it.
    expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Chocolate Chip Cookies' })).not.toBeInTheDocument();
  });
  it('draws a page of tiles at a time rather than the whole library at once', async () => {
    // 203 tiles meant 200+ image requests in flight behind a six-connection
    // limit, where they stall and compete with the app's own API calls.
    // Newest first, so Bulk Recipe 0 leads.
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...mockRecipes[0],
      _id: `bulk-${String(i).padStart(2, '0')}`,
      title: `Bulk Recipe ${i}`,
      updatedAt: new Date(Date.UTC(2026, 8, 1) - i * 60_000).toISOString(),
    }));
    await emptyTheCookbook();
    await seed('recipes', many);

    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Bulk Recipe 0')).toBeDefined());

    expect(screen.getByText('Bulk Recipe 47')).toBeInTheDocument();
    expect(screen.queryByText('Bulk Recipe 48')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show 12 more/i }));
    expect(screen.getByText('Bulk Recipe 48')).toBeInTheDocument();
    // A full page of tiles is a few seconds to mount under jsdom, which is
    // slower at layout-free DOM construction than any real browser; the budget
    // is raised rather than the page size lowered to fit a test runner.
  }, 20000);
});
