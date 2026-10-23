import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import GroceryList from './GroceryList';
import { repo } from '../lib/repo';
import { makePantryItem, makeRecipe, renderScreen, seed } from '../test/utils';

const RECIPES = [
  makeRecipe({
    _id: 'r1',
    title: 'Sourdough Bread',
    ingredients: [
      { name: 'Bread Flour', quantity: 500, unit: 'g' },
      { name: 'Water', quantity: 350, unit: 'ml' },
      { name: 'Salt', quantity: 10, unit: 'g' },
    ],
  }),
  makeRecipe({
    _id: 'r2',
    title: 'Chocolate Chip Cookies',
    ingredients: [
      { name: 'All Purpose Flour', quantity: 250, unit: 'g' },
      { name: 'Butter', quantity: 150, unit: 'g' },
    ],
  }),
];

describe('GroceryList Component', () => {
  beforeEach(async () => {
    await seed('recipes', RECIPES);
    // Salt is in the pantry, so no list asks for it.
    await seed('pantry', [makePantryItem({ _id: 'p1', name: 'Salt' })]);
  });

  it('renders the bank of recipes and an empty checklist', async () => {
    renderScreen(<GroceryList />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Grocery list/i })).toBeInTheDocument();
      expect(screen.getByText('Sourdough Bread')).toBeDefined();
    });
    expect(screen.getByText(/Nothing to buy/i)).toBeInTheDocument();
  });

  it('filters out ingredients present in pantry when recipe selected', async () => {
    renderScreen(<GroceryList />);
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
    renderScreen(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    const key = screen.getByRole('button', { name: /Sourdough Bread/i });
    expect(key).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(key);
    await waitFor(() => expect(key).toHaveAttribute('aria-pressed', 'true'));
  });

  it('allows adding a custom manual item', async () => {
    renderScreen(<GroceryList />);
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
    renderScreen(<GroceryList />);
    await waitFor(() => expect(screen.getByText('Sourdough Bread')).toBeDefined());

    fireEvent.click(screen.getByText('Sourdough Bread'));
    await waitFor(() => expect(screen.getByText('2 remaining')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });
  });

  it('lists what a recipe page added, kept on the device, ticked and removed there', async () => {
    const [cream] = await repo.addShoppingItems([{ name: 'sour cream', quantity: 0.5, unit: 'cup', recipeId: 'r1', recipeTitle: 'Cheesecake' }]);
    renderScreen(<GroceryList />);
    expect(await screen.findByText('sour cream')).toBeInTheDocument();
    expect(screen.getByText('Cheesecake')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /sour cream/ }));
    await waitFor(async () => expect((await repo.getShopping())[0].checked).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Remove sour cream from the list' }));
    await waitFor(async () => expect(await repo.getShopping()).toEqual([]));
    void cream;
  });
});
