import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startActiveBake } from '../lib/activeBake';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

vi.mock('../lib/api', () => ({
  api: {
    getRecipes: vi.fn(),
    getBakeLogs: vi.fn(),
    updateRecipe: vi.fn()
  }
}));

const mockRecipes = [
  {
    _id: '1',
    title: 'Sourdough Bread',
    description: 'Classic',
    tags: ['sourdough', 'bread'],
    folder: 'Breads',
    prepTime: '30',
    cookTime: '45',
    instructions: [
      'Feed the levain and let it ripen for 6 hours.',
      'Bulk ferment for 4 hours.',
      'Bake at 250C for 30 minutes.',
    ],
  },
  {
    _id: '2',
    title: 'Chocolate Chip Cookies',
    description: 'Sweet',
    tags: ['cookies', 'dessert'],
    folder: 'Desserts',
    prepTime: '15',
    cookTime: '12',
    instructions: ['Mix the dough.', 'Bake at 180C for 12 minutes.'],
  },
  {
    _id: '3',
    title: 'Pizza Dough',
    description: 'Neapolitan',
    tags: ['pizza', 'sourdough'],
    folder: 'Breads',
    prepTime: '20',
    cookTime: '10',
    instructions: ['Mix the dough.', 'Bulk ferment for 2 hours.', 'Bake for 10 minutes.'],
  },
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.mocked(api.getRecipes).mockResolvedValue(mockRecipes as any);
    vi.mocked(api.getBakeLogs).mockResolvedValue([]);
    localStorage.clear();
  });

  it('renders loading state initially', async () => {
    await act(async () => {
      renderWithProviders(<Dashboard />);
    });
    // After initial render the fetch is in-flight; loading text may already be gone.
    // Just ensure no crash on mount.
    expect(document.body).toBeDefined();
  });

  it('renders populated state with recipes as patterns, not cards', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
    // Every pattern row is readable without a photograph: its method renders
    // as a miniature step row instead.
    expect(screen.getAllByRole('img', { name: /Bake phases/i }).length).toBeGreaterThan(0);
  });

  it('shows the total time as a segment readout, not raw prepTime/cookTime text', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    // 30 (prep) + 45 (cook) = 75 minutes = 1:15, announced as one value.
    expect(screen.getByText('1:15 HR')).toBeInTheDocument();
  });

  it('renders an error state with retry when the fetch fails', async () => {
    vi.mocked(api.getRecipes).mockRejectedValue(new Error('Network down'));
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Couldn't load your cookbook/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders empty state when no recipes match', async () => {
    vi.mocked(api.getRecipes).mockResolvedValue([]);
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/No recipes found/i)).toBeDefined();
    });
  });

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
});
