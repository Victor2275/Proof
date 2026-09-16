import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecipeHeader from './RecipeHeader';
import type { Recipe } from '../lib/api';

const recipe: Recipe = {
  _id: 'r1',
  title: 'Country Sourdough',
  description: 'A long-fermented loaf.',
  imageUrls: ['https://example.com/sourdough.jpg'],
  servings: 4,
  difficulty: 'Hard',
  prepTime: '30',
  cookTime: '45',
  tags: ['bread', 'sourdough'],
  folder: 'Breads',
  ingredients: [],
  instructions: [
    'Feed the levain and let it ripen for 6 hours.',
    'Autolyse the flour and water for 1 hour.',
    'Bulk ferment for 4 hours.',
    'Shape the loaf and bench rest.',
    'Proof overnight in the fridge.',
    'Bake at 250C for 30 minutes.',
  ],
};

describe('RecipeHeader', () => {
  it('leads with the title, not the photograph', () => {
    render(<RecipeHeader recipe={recipe} scaleMultiplier={1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Country Sourdough' })).toBeInTheDocument();
  });

  it('frames the photograph as a plate', () => {
    render(<RecipeHeader recipe={recipe} scaleMultiplier={1} />);
    expect(screen.getByRole('img', { name: 'Country Sourdough' })).toHaveAttribute(
      'src',
      'https://example.com/sourdough.jpg',
    );
  });

  it('reads the total time, not just prep and cook separately', () => {
    render(<RecipeHeader recipe={recipe} scaleMultiplier={1} />);
    // 30 prep + 45 cook = 75 minutes, which reads as 1:15 on a display.
    expect(screen.getByRole('img', { name: /Total 1:15/i })).toBeInTheDocument();
  });

  it('scales the serving count and lights it when the recipe is no longer as written', () => {
    const { rerender } = render(<RecipeHeader recipe={recipe} scaleMultiplier={1} />);
    expect(screen.getByRole('img', { name: 'Serves 4' })).toBeInTheDocument();

    rerender(<RecipeHeader recipe={recipe} scaleMultiplier={2} />);
    // The caption says the recipe is being scaled, so the number on screen is
    // never mistaken for what the recipe was written at.
    expect(screen.getByRole('img', { name: /Serves · 2× 8/ })).toBeInTheDocument();
  });

  it("shows the bake's shape as a step row", () => {
    render(<RecipeHeader recipe={recipe} scaleMultiplier={1} />);
    expect(screen.getByRole('img', { name: /Country Sourdough phases/i })).toBeInTheDocument();
  });

  it('reads a missing duration as an unlit display rather than omitting it', () => {
    render(
      <RecipeHeader recipe={{ ...recipe, prepTime: '', cookTime: '' }} scaleMultiplier={1} />,
    );
    expect(screen.getByRole('img', { name: /Prep -- MIN/i })).toBeInTheDocument();
  });
});
