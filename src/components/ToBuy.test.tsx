import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ToBuy from './ToBuy';
import { listAsText, stillNeeded } from '../lib/shopping';
import { ToastProvider } from './ui';
import { repo } from '../lib/repo';
import type { ShoppingItem } from '../lib/types';
import { makePantryItem, makeRecipe, renderScreen, seed } from '../test/utils';

const BREAD = makeRecipe({
  _id: 'r1',
  title: 'Sourdough Bread',
  ingredients: [
    { name: 'Bread Flour', quantity: 500, unit: 'g' },
    { name: 'Water', quantity: 350, unit: 'ml' },
    { name: 'Salt', quantity: 10, unit: 'g' },
  ],
});

const item = (over: Partial<ShoppingItem>): ShoppingItem =>
  ({ _id: over.name ?? 'x', name: 'x', quantity: null, unit: '', checked: false, createdAt: '', updatedAt: '', deletedAt: null, ...over }) as ShoppingItem;

const show = () =>
  renderScreen(
    <ToastProvider>
      <ToBuy />
    </ToastProvider>,
  );

describe('what a recipe still needs', () => {
  it('leaves out what is in the cupboard and what is already waiting on the list', () => {
    const needed = stillNeeded(BREAD, [makePantryItem({ name: 'Salt' })], [item({ name: 'water' })]);
    expect(needed.map((n) => n.name)).toEqual(['Bread Flour']);
    expect(needed[0]).toMatchObject({ quantity: 500, unit: 'g', recipeId: 'r1', recipeTitle: 'Sourdough Bread' });
  });
});

describe('the list as text', () => {
  it('reads by aisle, leaving out what is in the basket', () => {
    const text = listAsText([
      item({ name: 'eggs', quantity: 3 }),
      item({ name: 'bread flour', quantity: 1, unit: 'kg' }),
      item({ name: 'milk', checked: true }),
    ]);
    expect(text).toBe('Dairy and eggs\n- 3 eggs\n\nFlour, grains and bread\n- 1 kg bread flour');
  });
});

describe('To buy', () => {
  it('says there is nothing to buy, and offers no Share for an empty list', async () => {
    show();
    expect(await screen.findByText('Nothing to buy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Share list/ })).toBeNull();
  });

  it('keeps a typed line on the device, read as an amount and a name, under its aisle', async () => {
    const user = userEvent.setup();
    show();
    await user.type(await screen.findByRole('textbox', { name: 'Add to the list' }), '2 lemons{Enter}');
    const aisle = await screen.findByRole('region', { name: 'Fruit and veg' });
    expect(within(aisle).getByText('lemons')).toBeInTheDocument();
    expect((await repo.getShopping()).map((s) => [s.name, s.quantity])).toEqual([['lemons', 2]]);
    expect(screen.getByRole('button', { name: /Share list/ })).toBeInTheDocument();
  });

  it('adds what a recipe needs and the cupboard lacks, with Undo', async () => {
    const user = userEvent.setup();
    await seed('recipes', [BREAD]);
    await seed('pantry', [makePantryItem({ _id: 'p1', name: 'Salt' })]);
    show();
    await user.click(await screen.findByRole('button', { name: 'Add from a recipe' }));
    await user.click(await screen.findByRole('button', { name: /Sourdough Bread/ }));
    expect(await screen.findByText('Added 2 from Sourdough Bread')).toBeInTheDocument();
    expect(await screen.findByText('Bread Flour')).toBeInTheDocument();
    expect(screen.queryByText('Salt')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getShopping()).toHaveLength(0));
  });

  it('moves a ticked thing to the basket, and clears the basket with Undo', async () => {
    const user = userEvent.setup();
    await repo.addShoppingItems([{ name: 'eggs', quantity: 6, unit: '' }]);
    show();
    await user.click(await screen.findByRole('checkbox', { name: /eggs/ }));
    const basket = await screen.findByRole('region', { name: 'In the basket' });
    expect(within(basket).getByText('eggs')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear ticked' }));
    await waitFor(async () => expect(await repo.getShopping()).toHaveLength(0));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getShopping()).toHaveLength(1));
  });

  it('takes one thing off the list, with Undo', async () => {
    const user = userEvent.setup();
    await repo.addShoppingItems([{ name: 'milk', quantity: null, unit: '' }]);
    show();
    await user.click(await screen.findByRole('button', { name: 'Take milk off the list' }));
    expect(await screen.findByText('milk taken off the list')).toBeInTheDocument();
    await waitFor(async () => expect(await repo.getShopping()).toHaveLength(0));
  });
});
