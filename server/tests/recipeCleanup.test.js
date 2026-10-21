import { describe, it, expect } from 'vitest';
import {
  cleanInstructions,
  cleanIngredient,
  splitSentences,
  splitLongStep,
  isPlaceholderTiming,
  isPlaceholderDescription,
} from '../services/recipeCleanup.js';

describe('cleanInstructions', () => {
  it('drops step labels stored as steps of their own', () => {
    expect(cleanInstructions(['step 1', 'Heat the oil.', 'STEP 2', 'Add the onion.', '3', '▢', '2.'])).toEqual([
      'Heat the oil.',
      'Add the onion.',
    ]);
  });

  it('drops section headings, ruled headings and capitalised numbered headings', () => {
    expect(
      cleanInstructions([
        'Preparation',
        'Chop the onion.',
        'Cooking Instructions',
        '--- Cheesecake ---',
        'STEP 2 - RINSE THE WHITE RICE',
        'Rinse the rice.',
        'Sorrel jam instructions',
        'Serving',
        'Enjoy',
      ]),
    ).toEqual(['Chop the onion.', 'Rinse the rice.']);
  });

  it('drops a label ending in a colon, including one that kept its number', () => {
    expect(cleanInstructions(['1. Steps for the Meat:', 'Season the goat.', 'Pro Tips:', 'Rest it.'])).toEqual([
      'Season the goat.',
      'Rest it.',
    ]);
  });

  it('drops the recipe title repeated as a step', () => {
    expect(cleanInstructions(['Sweet and Sour Pork', 'Slice the pork.'], 'Sweet and Sour Pork')).toEqual([
      'Slice the pork.',
    ]);
  });

  it('strips a leading number from a step that kept it', () => {
    expect(cleanInstructions(['1. Crack the egg.', '2) Beat it.'])).toEqual(['Crack the egg.', 'Beat it.']);
  });

  it('strips a number with no space after it, but not a decimal quantity', () => {
    expect(cleanInstructions(['01.Put the potatoes on.', '1.5 cups of stock go in.'])).toEqual([
      'Put the potatoes on.',
      '1.5 cups of stock go in.',
    ]);
  });

  it('removes references to missing photographs, encoding debris and smileys', () => {
    expect(
      cleanInstructions([
        'Fold the ends into the middle (See picture 1), then fold in half (pic 2).',
        'Cook for ?10 minutes in a loose-?bottomed tin.',
        'Cook like pancakes ;)',
      ]),
    ).toEqual(['Fold the ends into the middle, then fold in half.', 'Cook for 10 minutes in a loose-bottomed tin.', 'Cook like pancakes']);
  });

  it('removes zero-width characters and empty steps', () => {
    expect(cleanInstructions(['​', '  Stir.  '])).toEqual(['Stir.']);
  });

  it('keeps short steps that are real instructions', () => {
    expect(cleanInstructions(['Serve warm.', 'Preheat oven at 375°F'])).toEqual(['Serve warm.', 'Preheat oven at 375°F']);
  });

  it('splits a method written as one long paragraph into steps', () => {
    const paragraph = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} tells you to do something useful.`).join(' ');
    const steps = cleanInstructions([paragraph]);
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.join(' ')).toBe(paragraph);
  });
});

describe('splitSentences / splitLongStep', () => {
  it('splits on sentence ends followed by a capital or a digit', () => {
    expect(splitSentences('Heat the oven. Bake for 20 mins. 2 more mins if pale.')).toEqual([
      'Heat the oven.',
      'Bake for 20 mins.',
      '2 more mins if pale.',
    ]);
  });

  it('does not split after an abbreviation followed by lower case', () => {
    expect(splitSentences('Cook approx. ten minutes. Serve.')).toEqual(['Cook approx. ten minutes.', 'Serve.']);
  });

  it('leaves a step of reasonable length alone', () => {
    expect(splitLongStep('Stir.')).toEqual(['Stir.']);
  });
});

describe('cleanIngredient', () => {
  it('turns the "unit" placeholder into a plain count', () => {
    expect(cleanIngredient({ name: 'Eggs', quantity: 2, unit: 'unit' })).toEqual({ name: 'Eggs', quantity: 2, unit: '' });
  });

  it('moves a preparation note out of the unit and into the name', () => {
    expect(cleanIngredient({ name: 'Onion', quantity: 1, unit: 'chopped' })).toEqual({
      name: 'Onion, chopped',
      quantity: 1,
      unit: '',
    });
  });

  it('keeps the measure and moves the words after it', () => {
    expect(cleanIngredient({ name: 'Garlic', quantity: 3, unit: 'clove crushed' })).toEqual({
      name: 'Garlic, crushed',
      quantity: 3,
      unit: 'clove',
    });
    expect(cleanIngredient({ name: 'garlic', quantity: 5, unit: 'chopped clove' })).toEqual({
      name: 'garlic, chopped',
      quantity: 5,
      unit: 'clove',
    });
  });

  it('gives a purpose no quantity at all, rather than an invented 1', () => {
    expect(cleanIngredient({ name: 'Rice Noodles', quantity: 1, unit: 'to serve' })).toEqual({
      name: 'Rice Noodles, to serve',
      quantity: null,
      unit: '',
    });
    expect(cleanIngredient({ name: 'sunflower oil', quantity: 1, unit: 'drizzle (for cooking)' })).toEqual({
      name: 'sunflower oil, for cooking',
      quantity: null,
      unit: '',
    });
  });

  it('reads citrus parts as a count of fruit', () => {
    expect(cleanIngredient({ name: 'Lemon', quantity: 1, unit: 'juice of half' })).toEqual({
      name: 'Lemon (juice)',
      quantity: 0.5,
      unit: '',
    });
    expect(cleanIngredient({ name: 'Lime', quantity: 1, unit: 'zest and juice of 2' })).toEqual({
      name: 'Lime (zest and juice)',
      quantity: 2,
      unit: '',
    });
    expect(cleanIngredient({ name: 'Lemon', quantity: 1, unit: 'grated zest of 1' })).toEqual({
      name: 'Lemon (grated zest)',
      quantity: 1,
      unit: '',
    });
  });

  it('keeps the metric half of a metric/imperial pair', () => {
    expect(cleanIngredient({ name: 'Rocket', quantity: 150, unit: 'g/6oz' })).toEqual({ name: 'Rocket', quantity: 150, unit: 'g' });
  });

  it('keeps a bracketed conversion with its measure, and a bracketed note goes to the name', () => {
    expect(cleanIngredient({ name: 'Macaroni', quantity: 8, unit: 'oz (230 grams)' })).toEqual({
      name: 'Macaroni',
      quantity: 8,
      unit: 'oz (230 grams)',
    });
    expect(cleanIngredient({ name: 'Peas', quantity: 200, unit: 'g (soaked overnight)' })).toEqual({
      name: 'Peas, soaked overnight',
      quantity: 200,
      unit: 'g',
    });
  });

  it('moves a weight given beside a count into the name', () => {
    expect(cleanIngredient({ name: 'Chicken Legs', quantity: 2, unit: '(460g)' })).toEqual({
      name: 'Chicken Legs (460g)',
      quantity: 2,
      unit: '',
    });
  });

  it('repairs a range that lost its first number', () => {
    expect(cleanIngredient({ name: 'Fish Sauce', quantity: 2, unit: '-3 tbsp' })).toEqual({
      name: 'Fish Sauce',
      quantity: 2,
      unit: 'tbsp',
    });
  });

  it('keeps size words as the unit, with or without a second measure', () => {
    expect(cleanIngredient({ name: 'Egg', quantity: 2, unit: 'large' })).toEqual({ name: 'Egg', quantity: 2, unit: 'large' });
    expect(cleanIngredient({ name: 'Garlic', quantity: 6, unit: 'medium clove sliced' })).toEqual({
      name: 'Garlic, sliced',
      quantity: 6,
      unit: 'medium clove',
    });
  });

  it('does not repeat a note the name already says, and fixes known typos', () => {
    expect(cleanIngredient({ name: 'Ancho Chillies', quantity: 2, unit: 'ancho' })).toEqual({
      name: 'Ancho Chillies',
      quantity: 2,
      unit: '',
    });
    expect(cleanIngredient({ name: 'chicken thighs', quantity: 16, unit: 'skinnless' }).name).toBe('chicken thighs, skinless');
  });

  it('writes the litre symbol as a capital', () => {
    expect(cleanIngredient({ name: 'Beef Stock', quantity: 1, unit: 'L' }).unit).toBe('L');
  });

  it('collapses doubled brackets in a name', () => {
    expect(cleanIngredient({ name: 'graham cracker crumbs ((170g))', quantity: 1, unit: 'cup' }).name).toBe(
      'graham cracker crumbs (170g)',
    );
  });

  it('leaves a well-formed row alone', () => {
    expect(cleanIngredient({ name: 'Flour', quantity: 500, unit: 'g' })).toEqual({ name: 'Flour', quantity: 500, unit: 'g' });
  });
});

describe('placeholder detection', () => {
  it('recognises the seed timing pair and nothing else', () => {
    expect(isPlaceholderTiming({ prepTime: '20 mins', cookTime: '30 mins' })).toBe(true);
    expect(isPlaceholderTiming({ prepTime: '20 mins', cookTime: '45 mins' })).toBe(false);
  });

  it('recognises the seed description', () => {
    expect(isPlaceholderDescription('A delicious Polish Dessert dish.')).toBe(true);
    expect(isPlaceholderDescription('A dense rye loaf.')).toBe(false);
  });
});
