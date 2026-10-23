import { describe, expect, it } from 'vitest';
import { aisleOf, byAisle } from './aisles';

describe('which aisle a thing is in', () => {
  it('reads the aisle from the words', () => {
    expect(aisleOf('Bread flour').label).toBe('Flour, grains and bread');
    expect(aisleOf('unsalted butter').label).toBe('Dairy and eggs');
    expect(aisleOf('Lemons').label).toBe('Fruit and veg');
    expect(aisleOf('olive oil').label).toBe('Tins, jars and oils');
  });

  it('puts frozen things in the freezer before their kind', () => {
    expect(aisleOf('frozen peas').label).toBe('Frozen');
  });

  it('never guesses: an unknown thing is "Everything else"', () => {
    expect(aisleOf('Baking paper').label).toBe('Everything else');
  });

  it('groups in walking order and leaves empty aisles out', () => {
    const groups = byAisle([{ name: 'Baking paper' }, { name: 'eggs' }, { name: 'Apples' }, { name: 'milk' }]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.name)])).toEqual([
      ['Fruit and veg', ['Apples']],
      ['Dairy and eggs', ['eggs', 'milk']],
      ['Everything else', ['Baking paper']],
    ]);
  });
});
