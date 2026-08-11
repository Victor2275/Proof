import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GroceryList from './GroceryList';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getRecipes: vi.fn(),
    getPantry: vi.fn()
  }
}));

const mockRecipes = [
  {
    _id: 'r1',
    title: 'Sourdough Bread',
    ingredients: [
      { name: 'Bread Flour', quantity: 500, unit: 'g' },
      { name: 'Water', quantity: 350, unit: 'ml' },
      { name: 'Salt', quantity: 10, unit: 'g' }
    ]
  },
  {
    _id: 'r2',
    title: 'Chocolate Chip Cookies',
    ingredients: [
      { name: 'All Purpose Flour', quantity: 250, unit: 'g' },
      { name: 'Butter', quantity: 150, unit: 'g' }
    ]
  }
];

const mockPantry = [
  { _id: 'p1', name: 'Salt' } // Salt is in pantry
];

describe('GroceryList Component', () => {
  beforeEach(() => {
    vi.mocked(api.getRecipes).mockResolvedValue(mockRecipes as any);
    vi.mocked(api.getPantry).mockResolvedValue(mockPantry as any);
  });

  it('renders title and empty checklist initial state', async () => {
    render(<GroceryList />);
    await waitFor(() => {
      expect(screen.getByText(/Grocery List Generator/i)).toBeDefined();
      expect(screen.getByText(/Sourdough Bread/i)).toBeDefined();
    });
  });

  it('filters out ingredients present in pantry when recipe selected', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const recipeBtn = screen.getByText('Sourdough Bread');
    fireEvent.click(recipeBtn);

    await waitFor(() => {
      expect(screen.getByText('Bread Flour')).toBeDefined();
      expect(screen.getByText('Water')).toBeDefined();
      // Salt is in pantry, so it should be filtered out
      expect(screen.queryByText('Salt')).toBeNull();
    });
  });

  it('allows adding a custom manual item', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText(/Grocery List Generator/i)).toBeDefined());

    const nameInput = screen.getByPlaceholderText(/Parchment Paper/i);
    fireEvent.change(nameInput, { target: { value: 'Parchment Paper' } });

    const addBtn = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Parchment Paper')).toBeDefined();
    });
  });

  it('toggles item checked state on click', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const recipeBtn = screen.getByText('Sourdough Bread');
    fireEvent.click(recipeBtn);

    await waitFor(() => expect(screen.getByText('Bread Flour')).toBeDefined());

    const itemRow = screen.getByText('Bread Flour');
    fireEvent.click(itemRow);

    // Item checklist item should update state
    await waitFor(() => {
      expect(screen.getByText(/1 items remaining/i)).toBeDefined();
    });
  });
});
