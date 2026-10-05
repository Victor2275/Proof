import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IngredientList from './IngredientList';
import type { Recipe } from '../lib/api';

const base: Recipe = {
  _id: 'r1',
  title: 'Loaf',
  description: '',
  imageUrls: [],
  servings: 1,
  prepTime: '',
  cookTime: '',
  tags: [],
  ingredients: [],
  instructions: [],
};

const renderList = (ingredients: Recipe['ingredients']) =>
  render(
    <IngredientList
      recipe={{ ...base, ingredients }}
      scaleMultiplier={1}
      showBakersMath
      setShowBakersMath={vi.fn()}
      inPantryMap={{}}
      checkedIngredients={{}}
      toggleCheck={vi.fn()}
      setAiSubstituteIngredient={vi.fn()}
      handleExportGroceryList={vi.fn()}
    />,
  );

describe("IngredientList baker's percentages", () => {
  it('reads each weighed ingredient as a share of the flour', () => {
    renderList([
      { name: 'Strong white flour', quantity: 1000, unit: 'g' },
      { name: 'Water', quantity: 750, unit: 'ml' },
    ]);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  /*
   * The live Danish rye printed 6153.8% beside its rye grain: grams over a
   * flour total summed from cups.
   */
  it('says why there are none, instead of a figure built from cups and grams', () => {
    renderList([
      { name: 'Rye Grain', quantity: 200, unit: 'g' },
      { name: 'Rye Flour', quantity: 2.5, unit: 'cup' },
    ]);
    expect(screen.queryByText(/^[\d.]+%$/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/flour by weight.*cup/);
  });
});
