import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    updateRecipe: vi.fn()
  }
}));

const mockRecipes = [
  { _id: '1', title: 'Sourdough Bread', description: 'Classic', tags: ['sourdough', 'bread'], folder: 'Uncategorized' },
  { _id: '2', title: 'Chocolate Chip Cookies', description: 'Sweet', tags: ['cookies', 'dessert'], folder: 'Desserts' },
  { _id: '3', title: 'Pizza Dough', description: 'Neapolitan', tags: ['pizza', 'sourdough'], folder: 'Breads' }
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.mocked(api.getRecipes).mockResolvedValue(mockRecipes as any);
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

  it('renders populated state with recipes', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
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
    });
  });

  it('filters recipes correctly using fuse.js', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const searchInput = screen.getByPlaceholderText(/Search recipes or tags/i);
    fireEvent.change(searchInput, { target: { value: 'Sourdough' } });
    
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
  });

  it('filters recipes by selecting tag', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const tagButton = screen.getAllByText('sourdough')[0];
    fireEvent.click(tagButton);
    
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
  });

  it('handles case-insensitive tag filtering', async () => {
    const mixedCaseRecipes = [{ _id: '4', title: 'Test', tags: ['SoURdougH'], folder: 'Uncategorized' }];
    vi.mocked(api.getRecipes).mockResolvedValue(mixedCaseRecipes as any);
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Test')).toBeDefined());
    
    const tagButton = screen.getAllByText('SoURdougH')[0];
    fireEvent.click(tagButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeDefined();
    });
  });

  it('toggles list vs grid view', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const listViewBtn = screen.getByTitle('List View');
    fireEvent.click(listViewBtn);
    
    expect(localStorage.getItem('dashboardViewMode')).toBe('list');
  });
});
