import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import IngredientList from './IngredientList';
import { ToastProvider } from './ui';
import { repo } from '../lib/repo';
import type { Component } from '../lib/types';
import { makePantryItem, renderScreen, seed } from '../test/utils';

const CHEESECAKE: Component[] = [
  { name: 'graham cracker crumbs (170g)', quantity: 1, unit: 'cup' },
  { name: 'sour cream', quantity: 0.6666, unit: 'cup' },
  { name: 'vanilla extract', quantity: 0.51, unit: 'fl oz' },
  { name: 'eggs, room temperature', quantity: 4, unit: '' },
];

function Harness({ ingredients = CHEESECAKE, servings: initial = 12 }: { ingredients?: Component[]; servings?: number }) {
  const [servings, setServings] = useState(initial);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <ToastProvider>
      <IngredientList
        recipe={{ _id: 'r1', title: 'Cheesecake', ingredients, servings: 12 }}
        servings={servings}
        onServingsChange={setServings}
        checked={checked}
        onToggle={(i) => setChecked((p) => ({ ...p, [i]: !p[i] }))}
      />
    </ToastProvider>
  );
}

const rows = () => screen.getAllByRole('checkbox');

describe('ingredients as a cookbook prints them', () => {
  it('prints kitchen fractions and a sensible unit, never "0.51 fl oz"', () => {
    renderScreen(<Harness />);
    expect(rows()[1]).toHaveTextContent('⅔ cup');
    expect(rows()[2]).toHaveTextContent('1 tbsp');
    expect(screen.queryByText(/0\.51|0\.67/)).not.toBeInTheDocument();
  });

  it('moves a weight out of the name into its own column, and sets the note apart', () => {
    renderScreen(<Harness />);
    expect(rows()[0]).toHaveTextContent('1 cupgraham cracker crumbs170 g');
    expect(within(rows()[3]).getByText(', room temperature')).toHaveClass('italic');
  });

  it('ticks one row at a time, the whole row being the control', async () => {
    const user = userEvent.setup();
    renderScreen(<Harness />);
    await user.click(rows()[1]);
    expect(rows()[1]).toHaveAttribute('aria-checked', 'true');
    expect(rows()[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('scales with the Serves stepper and offers the way back', async () => {
    const user = userEvent.setup();
    renderScreen(<Harness />);
    for (let i = 0; i < 12; i++) await user.click(screen.getByRole('button', { name: 'More servings' }));
    expect(screen.getByText('Serves 24')).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent('2 cup');
    expect(rows()[0]).toHaveTextContent('340 g');
    await user.click(screen.getByRole('button', { name: 'Back to 12' }));
    expect(screen.getByText('Serves 12')).toBeInTheDocument();
  });
});

describe('the pantry and the shopping list', () => {
  it('says nothing about a pantry that was never set up', () => {
    renderScreen(<Harness />);
    expect(screen.queryByText(/pantry/i)).not.toBeInTheDocument();
    expect(screen.queryByText('✓ have')).not.toBeInTheDocument();
  });

  it('marks only what you have, once there is a pantry', async () => {
    await seed('pantry', [makePantryItem({ name: 'Eggs' })]);
    renderScreen(<Harness />);
    await waitFor(() => expect(rows()[3]).toHaveTextContent('✓ have'));
    expect(rows()[1]).not.toHaveTextContent('have');
  });

  it('adds what is missing to Shop in one press, and Undo takes it back', async () => {
    const user = userEvent.setup();
    await seed('pantry', [makePantryItem({ name: 'Eggs' })]);
    renderScreen(<Harness />);
    const add = await screen.findByRole('button', { name: /Add 3 missing to Shop/ });
    expect(add).toHaveTextContent('graham cracker crumbs, sour cream +1');
    await user.click(add);
    await waitFor(async () => expect((await repo.getShopping()).map((s) => s.name)).toEqual(['graham cracker crumbs', 'sour cream', 'vanilla extract']));
    expect((await repo.getShopping())[0]).toMatchObject({ recipeId: 'r1', recipeTitle: 'Cheesecake', quantity: 1, unit: 'cup' });
    await waitFor(() => expect(rows()[0]).toHaveTextContent('On list'));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getShopping()).toEqual([]));
  });
});

describe("baker's percentages", () => {
  const BREAD: Component[] = [
    { name: 'Bread flour', quantity: 500, unit: 'g' },
    { name: 'Water', quantity: 375, unit: 'g' },
    { name: 'Salt', quantity: 1, unit: 'tsp' },
  ];

  it('are offered only for a recipe whose flour is weighed', () => {
    const { unmount } = renderScreen(<Harness />);
    expect(screen.queryByRole('button', { name: "Baker's %" })).not.toBeInTheDocument();
    unmount();
    renderScreen(<Harness ingredients={BREAD} />);
    expect(screen.getByRole('button', { name: "Baker's %" })).toBeInTheDocument();
  });

  it('read each weighed ingredient as a share of the flour, and a dash where there is none', async () => {
    const user = userEvent.setup();
    renderScreen(<Harness ingredients={BREAD} />);
    await user.click(screen.getByRole('button', { name: "Baker's %" }));
    expect(rows()[0]).toHaveTextContent('100.0%');
    expect(rows()[1]).toHaveTextContent('75.0%');
    expect(rows()[2]).toHaveTextContent('—');
  });
});
