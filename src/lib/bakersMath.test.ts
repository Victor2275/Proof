import { describe, it, expect } from 'vitest';
import { bakersMath, bakersMathUnavailable, gramsOf } from './bakersMath';

describe('gramsOf', () => {
  it('converts weights to grams', () => {
    expect(gramsOf({ name: 'Flour', quantity: 1.2, unit: 'kg' })).toBe(1200);
    expect(gramsOf({ name: 'Salt', quantity: 20, unit: 'g' })).toBe(20);
    expect(gramsOf({ name: 'Butter', quantity: 1, unit: 'lb' })).toBeCloseTo(453.6, 1);
  });

  it('counts millilitres as grams for water only', () => {
    expect(gramsOf({ name: 'Water', quantity: 700, unit: 'ml' })).toBe(700);
    expect(gramsOf({ name: 'Warm water', quantity: 0.5, unit: 'l' })).toBe(500);
    expect(gramsOf({ name: 'Milk', quantity: 250, unit: 'ml' })).toBeNull();
  });

  it('refuses volumes and counts that are not weights', () => {
    expect(gramsOf({ name: 'Flour', quantity: 2.5, unit: 'cup' })).toBeNull();
    expect(gramsOf({ name: 'Eggs', quantity: 2, unit: 'unit' })).toBeNull();
    expect(gramsOf({ name: 'Salt', quantity: 1, unit: 'pinch' })).toBeNull();
  });
});

describe('bakersMath', () => {
  it('takes every weighed ingredient as a share of the total flour', () => {
    const result = bakersMath([
      { name: 'Strong white flour', quantity: 900, unit: 'g' },
      { name: 'Whole wheat flour', quantity: 100, unit: 'g' },
      { name: 'Water', quantity: 750, unit: 'ml' },
      { name: 'Fine sea salt', quantity: 20, unit: 'g' },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.flourGrams).toBe(1000);
    expect(result.percentages).toEqual([90, 10, 75, 2]);
  });

  it('leaves an ingredient it cannot weigh without a share rather than at zero', () => {
    const result = bakersMath([
      { name: 'Flour', quantity: 500, unit: 'g' },
      { name: 'Eggs', quantity: 2, unit: 'unit' },
    ]);
    expect(result.ok && result.percentages[1]).toBeNull();
  });

  /*
   * The live Danish rye: 200 g rye grain against 0.75 cup plus 2.5 cup of
   * flour, which the old reading summed to 3.25 and printed as 6153.8%.
   */
  it('reports no percentages when the flour is measured by volume', () => {
    const result = bakersMath([
      { name: 'Rye Grain', quantity: 200, unit: 'g' },
      { name: 'All purpose flour', quantity: 0.75, unit: 'cup' },
      { name: 'Rye Flour', quantity: 2.5, unit: 'cup' },
    ]);
    expect(result).toEqual({ ok: false, reason: 'flour-not-weighed', unweighedUnit: 'cup' });
    if (result.ok) return;
    expect(bakersMathUnavailable(result)).toMatch(/flour by weight.*cup/);
  });

  it('says there is nothing to take percentages of when there is no flour', () => {
    const result = bakersMath([{ name: 'King prawns', quantity: 400, unit: 'g' }]);
    expect(result).toEqual({ ok: false, reason: 'no-flour' });
  });
});
