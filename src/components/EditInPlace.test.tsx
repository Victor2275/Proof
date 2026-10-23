import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditInPlace from './EditInPlace';
import RecipeEditor from './RecipeEditor';
import { repo } from '../lib/repo';
import { makeRecipe, renderScreen, seed } from '../test/utils';

const SCONES = makeRecipe({
  _id: 'r1',
  title: 'Scones',
  ingredients: [
    { name: 'self-raising flour', quantity: 350, unit: 'g' },
    { name: 'milk', quantity: 0.6667, unit: 'cup' },
  ],
  instructions: ['Rub in the butter.', 'Bake for 12 minutes.'],
});

describe('Edit here', () => {
  it('turns the recipe into fields in place, and Save writes them back', async () => {
    const user = userEvent.setup();
    await seed('recipes', [SCONES]);
    const onDone = vi.fn();
    renderScreen(<EditInPlace recipe={SCONES} onDone={onDone} />);

    const ingredients = screen.getByRole('textbox', { name: 'Ingredients' });
    expect(ingredients).toHaveValue('350 g self-raising flour\n⅔ cup milk');

    await user.clear(screen.getByRole('textbox', { name: 'Line 2 of the method' }));
    await user.type(screen.getByRole('textbox', { name: 'Line 2 of the method' }), 'Bake for 14 minutes.');
    await user.type(ingredients, '\n2 eggs');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const saved = await repo.getRecipe('r1');
    expect(saved?.instructions).toEqual(['Rub in the butter.', 'Bake for 14 minutes.']);
    // An untouched line keeps its stored amount exactly, not a re-read of "⅔".
    expect(saved?.ingredients).toEqual([
      { name: 'self-raising flour', quantity: 350, unit: 'g' },
      { name: 'milk', quantity: 0.6667, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: '' },
    ]);
  });

  it('will not save a recipe without a title, and says so', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderScreen(<EditInPlace recipe={SCONES} onDone={onDone} />);
    await user.clear(screen.getByRole('textbox', { name: /Title/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A recipe needs a title.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps the full editor one press away', () => {
    renderScreen(<EditInPlace recipe={SCONES} onDone={() => undefined} />);
    expect(screen.getByRole('link', { name: 'Full editor' })).toHaveAttribute('href', '/edit/r1');
  });
});

describe('the editor preview', () => {
  it('shows the recipe as the page will print it, beside the form', async () => {
    await seed('recipes', [SCONES]);
    renderScreen(<RecipeEditor />, { route: '/edit/r1', path: '/edit/:id' });
    const preview = await screen.findByRole('complementary', { name: 'Preview' });
    await waitFor(() => expect(preview).toHaveTextContent('Scones'));
    expect(preview).toHaveTextContent('⅔ cup');
    expect(preview).toHaveTextContent('Bake for 12 minutes.');
  });
});
