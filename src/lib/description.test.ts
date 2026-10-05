import { describe, it, expect } from 'vitest';
import { isPlaceholderDescription, meaningfulDescription } from './description';

describe('isPlaceholderDescription', () => {
  it('recognises the seed script template, with and without an area', () => {
    expect(isPlaceholderDescription('A delicious Venezuela Beef dish.')).toBe(true);
    expect(isPlaceholderDescription('A delicious Thai Seafood dish.')).toBe(true);
    // The seed wrote an empty area as a double space.
    expect(isPlaceholderDescription('A delicious  Dessert dish.')).toBe(true);
  });

  it('leaves a description someone actually wrote alone', () => {
    expect(isPlaceholderDescription('A simple and quick French omelette recipe, optionally including sausage and cheese.')).toBe(false);
    expect(isPlaceholderDescription('How to make the creamiest cheesecake. There is no water bath required.')).toBe(false);
    // Same words, the baker's own: lowercase, not TheMealDB's categories.
    expect(isPlaceholderDescription('A delicious lamb dish.')).toBe(false);
    expect(isPlaceholderDescription('A delicious Beef dish. Braised for six hours.')).toBe(false);
  });

  it('treats nothing as not a placeholder', () => {
    expect(isPlaceholderDescription('')).toBe(false);
    expect(isPlaceholderDescription(undefined)).toBe(false);
  });
});

describe('meaningfulDescription', () => {
  it('returns the description worth printing, or null', () => {
    expect(meaningfulDescription('  A long-fermented country loaf.  ')).toBe('A long-fermented country loaf.');
    expect(meaningfulDescription('A delicious Side dish.')).toBeNull();
    expect(meaningfulDescription('   ')).toBeNull();
    expect(meaningfulDescription(null)).toBeNull();
  });
});
