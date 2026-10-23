import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecipeHeader from './RecipeHeader';
import { factsLine } from '../lib/facts';
import { makeRecipe, renderScreen } from '../test/utils';

describe('the top of a recipe', () => {
  it('prints the facts as one line, as a cookbook does', () => {
    expect(factsLine({ servings: 12, prepTime: '20', cookTime: '75', difficulty: 'Medium' })).toBe(
      'Serves 12 · Prep 20 min · Cook 1 h 15 · Medium',
    );
  });

  it('leaves out times that are the import placeholder, rather than print them as measured', () => {
    expect(factsLine({ servings: 4, prepTime: '20 mins', cookTime: '30 mins', difficulty: '' })).toBe('Serves 4');
  });

  it("does not print the seed script's template description", () => {
    renderScreen(<RecipeHeader recipe={makeRecipe({ description: 'A delicious Venezuela Beef dish.' })} />);
    expect(screen.queryByText(/A delicious/)).not.toBeInTheDocument();
  });

  it('leads with the photograph, then the title; a recipe without one gets its drop cap', () => {
    renderScreen(<RecipeHeader recipe={makeRecipe({ title: 'Rye', imageUrls: [] })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rye' })).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('offers "Add times" to the owner of a recipe with none', () => {
    const recipe = makeRecipe({ _id: 'r9', prepTime: '', cookTime: '' });
    renderScreen(<RecipeHeader recipe={recipe} ownRecipe={recipe} />);
    expect(screen.getByRole('link', { name: /Add times/ })).toHaveAttribute('href', '/edit/r9');
  });

  it('shows the publish chip only with somewhere to open it', () => {
    const recipe = makeRecipe();
    renderScreen(<RecipeHeader recipe={recipe} ownRecipe={recipe} onPublish={() => undefined} />);
    expect(screen.getByRole('button', { name: /Private · this device/ })).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
