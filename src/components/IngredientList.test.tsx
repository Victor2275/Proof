import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('IngredientList scale bank', () => {
  const props = {
    recipe: { ...base, ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }] },
    showBakersMath: false,
    setShowBakersMath: vi.fn(),
    inPantryMap: {},
    checkedIngredients: {},
    toggleCheck: vi.fn(),
    setAiSubstituteIngredient: vi.fn(),
    handleExportGroceryList: vi.fn(),
  };

  it('sits with the quantities it changes, one multiplier engaged', async () => {
    const setScale = vi.fn();
    render(<IngredientList {...props} scaleMultiplier={2} setScaleMultiplier={setScale} />);

    const bank = screen.getByRole('group', { name: 'Scale recipe' });
    expect(within(bank).getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(bank).getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'false');
    // The list it scales is printed at the multiplier.
    expect(screen.getByText('1000')).toBeInTheDocument();

    await userEvent.setup().click(within(bank).getByRole('button', { name: '3x' }));
    expect(setScale).toHaveBeenCalledWith(3);
  });

  it('is left out of an exported PDF', () => {
    render(<IngredientList {...props} scaleMultiplier={1} setScaleMultiplier={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Scale recipe' })).toHaveAttribute(
      'data-html2canvas-ignore',
      'true',
    );
  });

  it('draws no bank when nothing can change the scale', () => {
    render(<IngredientList {...props} scaleMultiplier={1} />);
    expect(screen.queryByRole('group', { name: 'Scale recipe' })).not.toBeInTheDocument();
  });
});

describe('IngredientList quantity column', () => {
  it('keeps a long unit inside the column, under its figure', () => {
    render(
      <IngredientList
        recipe={{ ...base, ingredients: [{ name: 'Spelt', quantity: 1, unit: 'tablespoon heaped' }] }}
        scaleMultiplier={1}
        showBakersMath={false}
        setShowBakersMath={vi.fn()}
        inPantryMap={{}}
        checkedIngredients={{}}
        toggleCheck={vi.fn()}
        setAiSubstituteIngredient={vi.fn()}
        handleExportGroceryList={vi.fn()}
      />,
    );
    const unit = screen.getByText('tablespoon heaped');
    // A wrapping flex column, so the unit breaks under the figure rather than
    // overflowing the fixed width into the ingredient's name.
    expect(unit.parentElement).toHaveClass('flex-wrap');
    expect(unit).toHaveClass('min-w-0');
  });
});
