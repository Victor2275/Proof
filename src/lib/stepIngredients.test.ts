import { describe, it, expect } from 'vitest';
import { ingredientsForStep, scaleTargetGrams } from './stepIngredients';

const ing = (name: string, quantity = 1, unit = 'g') => ({ name, quantity, unit });

// The live Danish rye, whose "This step needs" panel was wrong on most steps.
const RYE = [
  ing('Rye Grain', 280),
  ing('Water', 0.75, 'cup'),
  ing('Rye Flour', 2.5, 'cup'),
  ing('All purpose flour', 0.75, 'cup'),
  ing('Yeast', 10),
  ing('Seeds', 130),
];
const names = (list: { name: string }[]) => list.map((i) => i.name);

describe('ingredientsForStep', () => {
  it('needs every distinguishing word, so rye grain is not rye flour', () => {
    const step = 'Combine rye grain and water in a saucepan and bring to a boil.';
    expect(names(ingredientsForStep(step, RYE))).toEqual(['Rye Grain', 'Water']);
  });

  it('matches whole words only, so "allow" is not "all purpose flour"', () => {
    expect(ingredientsForStep('Allow the bread to cool completely before slicing.', RYE)).toEqual([]);
  });

  it('finds each flour a step names, hyphenated or not', () => {
    const step = 'Add all-purpose flour and rye flour, and knead for about 10 minutes.';
    expect(names(ingredientsForStep(step, RYE))).toEqual(['Rye Flour', 'All purpose flour']);
  });

  it('folds plurals and ignores preparation words', () => {
    const list = [ing('Eggs', 2, 'unit'), ing('Garlic, minced', 2, 'clove'), ing('Extra virgin olive oil', 2, 'tbsp')];
    const step = 'Beat the egg, then fry the garlic in the olive oil.';
    expect(names(ingredientsForStep(step, list))).toEqual(['Eggs', 'Garlic, minced', 'Extra virgin olive oil']);
  });

  it('returns nothing rather than a guess when no ingredient is named', () => {
    expect(ingredientsForStep('Cover and leave somewhere warm.', RYE)).toEqual([]);
  });
});

describe('scaleTargetGrams', () => {
  it('sums the weighed ingredients of a step in grams', () => {
    expect(scaleTargetGrams([ing('Yeast', 10), ing('Seeds', 130)])).toBe(140);
    expect(scaleTargetGrams([ing('Flour', 1, 'kg'), ing('Water', 700, 'ml')])).toBe(1700);
  });

  it('has no target when any ingredient is not weighed, rather than mixing units', () => {
    // 280 g of grain and 0.75 cup of water used to be a "280.75 g" target.
    expect(scaleTargetGrams([ing('Rye Grain', 280), ing('Water', 0.75, 'cup')])).toBeNull();
    expect(scaleTargetGrams([])).toBeNull();
  });
});
