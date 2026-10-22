import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecipeTile } from './RecipeTile';
import type { Recipe } from '../../lib/types';
import { makeRecipe } from '../../test/utils';

const base: Recipe = makeRecipe({
  _id: 'r1',
  title: 'Pork Cassoulet',
  description: '',
  imageUrls: ['https://example.com/cassoulet.jpg'],
  servings: 4,
  // The live library's seed placeholder, on 199 of 203 recipes.
  prepTime: '20 mins',
  cookTime: '30 mins',
  tags: [],
  folder: 'Pork',
  ingredients: [
    { name: 'Pork', quantity: 500, unit: 'g' },
    { name: 'Beans', quantity: 300, unit: 'g' },
  ],
  instructions: ['Chop the pork.', 'Simmer for two hours.', 'Serve hot.'],
});

const sourdough: Recipe = makeRecipe({
  ...base,
  _id: 'r2',
  title: 'Country Sourdough',
  folder: 'Breads',
  // Bare minutes are what the app's own form writes: a real timing.
  prepTime: '30',
  cookTime: '45',
  instructions: [
    'Feed the levain and let it ripen for 6 hours.',
    'Autolyse the flour and water.',
    'Bulk ferment for 4 hours.',
    'Shape and proof overnight.',
    'Bake at 250C.',
  ],
});

const renderTile = (recipe: Recipe, active = false) =>
  render(
    <MemoryRouter>
      <RecipeTile recipe={recipe} active={active} />
    </MemoryRouter>,
  );

describe('RecipeTile', () => {
  it('leads with the photograph and names it underneath', () => {
    renderTile(base);
    expect(screen.getByRole('img', { name: 'Pork Cassoulet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pork Cassoulet' })).toBeInTheDocument();
  });

  it('links to the recipe from anywhere on the tile', () => {
    renderTile(base);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/recipe/r1');
  });

  it('keeps a tile to a photograph, a title and one line', () => {
    // Phases and timings used to slide up over the photo on hover. A cookbook
    // tile is browsed by picture and name; the rest belongs on the recipe.
    renderTile(sourdough);
    expect(screen.queryByRole('img', { name: /phases/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('falls back to facts the recipe can actually prove', () => {
    renderTile(base);
    expect(screen.getByText(/Pork · 2 ingredients/)).toBeInTheDocument();
  });

  it('suppresses the seed placeholder time but prints a real one as a cookbook does', () => {
    const { unmount } = renderTile(base);
    // "20 mins" + "30 mins" verbatim is the import script's default, not a
    // measurement — 199 unrelated recipes share it.
    expect(screen.queryByText(/50 min/)).not.toBeInTheDocument();
    unmount();

    renderTile(sourdough);
    expect(screen.getByText('Breads · 1 h 15')).toBeInTheDocument();
  });

  it('rings the photograph in the accent when its bake is running', () => {
    const { container } = renderTile(base, true);
    expect(container.querySelector('.ring-accent')).not.toBeNull();
  });

  it('answers the press as one control', () => {
    renderTile(base);
    expect(screen.getByRole('link')).toHaveClass('pressable');
  });

  it('never scales on hover, so the grid cannot shift under the cursor', () => {
    const { container } = renderTile(base);
    expect(container.innerHTML).not.toMatch(/hover:scale|group-hover:scale/);
  });
});
