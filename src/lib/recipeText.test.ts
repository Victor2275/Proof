import { describe, it, expect } from 'vitest';
import { cleanText, decodeEntities, headnote, methodSections, methodSteps, sectionHeading } from './recipeText';
import { friendlyAmount, friendlyAmountText, ingredientParts, kitchenFraction } from './quantities';

describe('recipe text as printed', () => {
  it('decodes the HTML entities an import leaves behind', () => {
    expect(decodeEntities('Don&#39;t over-beat &amp; don&rsquo;t rush')).toBe('Don\'t over-beat & don’t rush');
    expect(decodeEntities('160&deg;C &#x2014; then cool')).toBe('160°C — then cool');
    expect(decodeEntities('&unknown; stays')).toBe('&unknown; stays');
  });

  it('collapses doubled parentheses and drops footnote marks with nothing to point at', () => {
    expect(cleanText('graham cracker crumbs ((170g))')).toBe('graham cracker crumbs (170g)');
    expect(cleanText('cream cheese² , softened')).toBe('cream cheese, softened');
    expect(cleanText('salt*')).toBe('salt');
  });

  it("takes the blog's asides out of a headnote and keeps what it says about the dish", () => {
    expect(
      headnote("How to make the creamiest cheesecake! There's no water bath required!Be sure to check out my step-by-step video below the recipe!"),
    ).toBe("How to make the creamiest cheesecake! There's no water bath required!");
  });
});

describe('method sections', () => {
  const method = [
    '--- Crust ---',
    'Preheat the oven.',
    'Press the crumbs into the tin.',
    '--- CHEESECAKE ---',
    'Beat the cream cheese.',
    '',
    'Bake for 55 minutes.',
  ];

  it('reads "--- X ---" and a short "For the X:" as headings, not steps', () => {
    expect(sectionHeading('--- Cheesecake ---')).toBe('Cheesecake');
    expect(sectionHeading('== Topping ==')).toBe('Topping');
    expect(sectionHeading('For the crust:')).toBe('Crust');
    expect(sectionHeading('Preheat the oven and grease two tins:')).toBeNull();
    expect(sectionHeading('Bake for 55 minutes.')).toBeNull();
  });

  it('groups the steps under them, numbering only real steps', () => {
    const sections = methodSections(method);
    expect(sections.map((s) => s.heading)).toEqual(['Crust', 'Cheesecake']);
    expect(sections[1].steps.map((s) => [s.number, s.index])).toEqual([
      [3, 4],
      [4, 6],
    ]);
  });

  it('keeps each step pointing at its place in the stored method, for baking mode and step notes', () => {
    expect(methodSteps(method).map((s) => s.index)).toEqual([1, 2, 4, 6]);
  });

  it('leaves a method with no headings as one unnamed section', () => {
    expect(methodSections(['Mix.', 'Bake.'])).toEqual([
      { heading: null, steps: [{ index: 0, number: 1, text: 'Mix.' }, { index: 1, number: 2, text: 'Bake.' }] },
    ]);
  });
});

describe('amounts as a cook writes them', () => {
  it('prints kitchen fractions', () => {
    expect(kitchenFraction(0.5)).toBe('½');
    expect(kitchenFraction(1.5)).toBe('1½');
    expect(kitchenFraction(0.6666)).toBe('⅔');
    expect(kitchenFraction(0.13)).toBe('⅛');
    expect(kitchenFraction(2)).toBe('2');
    expect(kitchenFraction(1.43)).toBe('1.43');
  });

  it('moves a measure too small for its unit to the smaller one', () => {
    expect(friendlyAmountText(0.51, 'fl oz')).toBe('1 tbsp');
    expect(friendlyAmountText(0.125, 'cup')).toBe('2 tbsp');
    expect(friendlyAmountText(0.13, 'tsp')).toBe('⅛ tsp');
    expect(friendlyAmountText(0.02, 'tsp')).toBe('a pinch');
    expect(friendlyAmountText(0.25, 'Tbsp')).toBe('¾ tsp');
  });

  it('keeps metric weights whole, and scales before printing', () => {
    expect(friendlyAmount(170.4, 'g')).toEqual({ quantity: '170', unit: 'g' });
    expect(friendlyAmountText(0.5, 'cup', 2)).toBe('1 cup');
    expect(friendlyAmountText(2, '', 0.75)).toBe('1½');
  });

  it('prints nothing for an ingredient with no amount', () => {
    expect(friendlyAmountText(null, '')).toBe('');
  });

  it("takes a weight out of the name into its own column, and the note after the comma", () => {
    expect(ingredientParts('graham cracker crumbs (170g)')).toEqual({ name: 'graham cracker crumbs', note: '', weight: '170 g' });
    expect(ingredientParts('cream cheese (910 g), softened', 0.5)).toEqual({ name: 'cream cheese', note: 'softened', weight: '455 g' });
  });
});
