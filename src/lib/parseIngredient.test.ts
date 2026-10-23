import { describe, it, expect } from 'vitest';
import { amountForField, parseAmount, parseIngredientBlock, parseIngredientLine } from './parseIngredient';

describe('amounts as people type them', () => {
  it('reads fractions, mixed numbers, decimals and the kitchen glyphs', () => {
    expect(parseAmount('1½')).toBe(1.5);
    expect(parseAmount('1 1/2')).toBe(1.5);
    expect(parseAmount('2/3')).toBe(0.667);
    expect(parseAmount('0,5')).toBe(0.5);
    expect(parseAmount('½')).toBe(0.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('to taste')).toBeNull();
  });

  it('shows a stored amount back as a kitchen fraction, never 0.6666', () => {
    expect(amountForField(0.6666)).toBe('⅔');
    expect(amountForField(2.5)).toBe('2½');
    expect(amountForField(null)).toBe('');
  });
});

describe('ingredient lines', () => {
  it('splits a line into amount, unit and name', () => {
    expect(parseIngredientLine('2 cups plain flour')).toEqual({ quantity: 2, unit: 'cups', name: 'plain flour' });
    expect(parseIngredientLine('½ tsp salt')).toEqual({ quantity: 0.5, unit: 'tsp', name: 'salt' });
    expect(parseIngredientLine('2/3 cup sour cream')).toEqual({ quantity: 0.667, unit: 'cup', name: 'sour cream' });
    expect(parseIngredientLine('1 1/2 cups milk')).toEqual({ quantity: 1.5, unit: 'cups', name: 'milk' });
    expect(parseIngredientLine('3 eggs, beaten')).toEqual({ quantity: 3, unit: '', name: 'eggs, beaten' });
    expect(parseIngredientLine('- 200g butter')).toEqual({ quantity: 200, unit: 'g', name: 'butter' });
    expect(parseIngredientLine('Salt, to taste')).toEqual({ quantity: null, unit: '', name: 'Salt, to taste' });
  });

  it('turns a pasted list into rows, and leaves a single line alone', () => {
    expect(parseIngredientBlock('1 cup sugar\n2 eggs\n\n1 tsp vanilla')).toHaveLength(3);
    expect(parseIngredientBlock('1 cup sugar')).toBeNull();
  });
});
