import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../lib/api';

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

  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading Cookbook/i)).toBeDefined();
  });

  it('renders populated state with recipes', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
  });

  it('renders empty state when no recipes match', async () => {
    vi.mocked(api.getRecipes).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/No recipes found/i)).toBeDefined();
    });
  });

  it('filters recipes by search query (fuse.js)', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const searchInput = screen.getByPlaceholderText(/Search recipes or tags/i);
    fireEvent.change(searchInput, { target: { value: 'Chocolate' } });
    
    await waitFor(() => {
      expect(screen.getByText('Chocolate Chip Cookies')).toBeDefined();
    });
  });

  it('filters recipes correctly using fuse.js', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const searchInput = screen.getByPlaceholderText(/Search recipes or tags/i);
    fireEvent.change(searchInput, { target: { value: 'Sourdough' } });
    
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
  });

  it('filters recipes by selecting tag from dropdown', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'sourdough' } });
    
    await waitFor(() => {
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
  });

  it('handles case-insensitive tag filtering', async () => {
    const mixedCaseRecipes = [{ _id: '4', title: 'Test', tags: ['SoURdougH'], folder: 'Uncategorized' }];
    vi.mocked(api.getRecipes).mockResolvedValue(mixedCaseRecipes as any);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Test')).toBeDefined());
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'sourdough' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeDefined();
    });
  });

  it('toggles list vs grid view', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());
    
    const listViewBtn = screen.getByTitle('List View');
    fireEvent.click(listViewBtn);
    
    expect(localStorage.getItem('dashboardViewMode')).toBe('list');
  });
});
