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

  it('renders the bank of recipes and an empty checklist', async () => {
    render(<GroceryList />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Grocery list/i })).toBeInTheDocument();
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
    expect(screen.getByText(/Nothing to buy/i)).toBeInTheDocument();
  });

  it('filters out ingredients present in pantry when recipe selected', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    fireEvent.click(screen.getByText('Sourdough Bread'));

    await waitFor(() => {
      expect(screen.getByText('Bread Flour')).toBeDefined();
      expect(screen.getByText('Water')).toBeDefined();
      // Salt is in pantry, so it should be filtered out
      expect(screen.queryByText('Salt')).toBeNull();
    });
  });

  it('latches the recipe key while it is feeding the list', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const key = screen.getByRole('button', { name: /Sourdough Bread/i });
    expect(key).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(key);
    await waitFor(() => expect(key).toHaveAttribute('aria-pressed', 'true'));
  });

  it('allows adding a custom manual item', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const nameInput = screen.getByPlaceholderText(/Parchment Paper/i);
    fireEvent.change(nameInput, { target: { value: 'Parchment Paper' } });

    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    await waitFor(() => {
      expect(screen.getByText('Parchment Paper')).toBeDefined();
    });
    // A hand-added item is the only kind that can be taken off again.
    expect(
      screen.getByRole('button', { name: /Remove Parchment Paper from the list/i }),
    ).toBeInTheDocument();
  });

  it('counts down what is left as items are checked off', async () => {
    render(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    fireEvent.click(screen.getByText('Sourdough Bread'));
    await waitFor(() => expect(screen.getByText('2 remaining')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });
  });
});
