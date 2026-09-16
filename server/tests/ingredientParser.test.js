import { describe, it, expect } from 'vitest';
import { parseIngredient } from '../services/ingredientParser.js';

describe('parseIngredient', () => {
  it('parses simple quantity + unit + name', () => {
    expect(parseIngredient('2 cups flour')).toEqual({ name: 'flour', quantity: 2, unit: 'cups' });
  });

  it('parses vulgar-fraction quantities (regression: used to dump the whole line into name)', () => {
    expect(parseIngredient('⅔ cup sour cream')).toEqual({ name: 'sour cream', quantity: 2 / 3, unit: 'cup' });
    expect(parseIngredient('⅛ teaspoon salt')).toEqual({ name: 'salt', quantity: 1 / 8, unit: 'teaspoon' });
  });

  it('parses a mixed whole number and vulgar fraction', () => {
    const result = parseIngredient('1 ½ cups sugar');
    expect(result.name).toBe('sugar');
    expect(result.unit).toBe('cups');
    expect(result.quantity).toBeCloseTo(1.5);
  });

  it('recognizes informal cooking units', () => {
    expect(parseIngredient('1 pinch salt')).toEqual({ name: 'salt', quantity: 1, unit: 'pinch' });
    expect(parseIngredient('2 cloves garlic')).toEqual({ name: 'garlic', quantity: 2, unit: 'cloves' });
  });

  it('falls back to unit "x" and keeps the full text in name when nothing recognizable is found', () => {
    const result = parseIngredient('a splash of vanilla');
    expect(result.unit).toBe('x');
    expect(result.name).toBe('a splash of vanilla');
  });
});
