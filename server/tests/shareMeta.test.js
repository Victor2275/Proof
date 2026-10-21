import { describe, it, expect } from 'vitest';
import { minutesOf, profileHead, recipeHead } from '../services/shareMeta.js';

const RYE = {
  slug: 'dark-rye',
  title: 'Dark "Rye" <loaf>',
  description: 'Dense & sour.',
  imageUrls: ['https://res.cloudinary.com/demo/rye.jpg'],
  servings: 2,
  prepTime: '1 hr 30 mins',
  cookTime: '60',
  tags: ['bread'],
  ingredients: [{ name: 'Rye flour', quantity: 500, unit: 'g' }, { name: 'Salt, to taste', quantity: null, unit: '' }],
  instructions: ['Mix.', 'Bake </script><script>alert(1)</script>.'],
  authorHandle: 'ada',
  publishedAt: '2026-10-01T00:00:00.000Z',
  stats: { ratingSum: 9, ratingCount: 2 },
};

const jsonLdOf = (tags) => JSON.parse(tags.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

describe('shared recipe previews', () => {
  it('reads durations the way the library writes them', () => {
    expect(minutesOf('90')).toBe(90);
    expect(minutesOf('1 hr 30 mins')).toBe(90);
    expect(minutesOf('2 hours')).toBe(120);
    expect(minutesOf('overnight')).toBeNull();
  });

  it('escapes every value that goes into the page', () => {
    const head = recipeHead(RYE, 'https://proof.example');
    expect(head.title).toBe('Dark &quot;Rye&quot; &lt;loaf&gt; · Proof');
    expect(head.tags).toContain('content="Dark &quot;Rye&quot; &lt;loaf&gt;"');
    expect(head.tags).toContain('content="Dense &amp; sour."');
    // No field can close the JSON-LD script and open another.
    expect(head.tags.match(/<\/script>/g)).toHaveLength(1);
    expect(head.tags).not.toContain('<script>alert');
  });

  it('describes the recipe to a search engine in schema.org terms', () => {
    const ld = jsonLdOf(recipeHead(RYE, 'https://proof.example').tags);
    expect(ld).toMatchObject({
      '@type': 'Recipe',
      name: 'Dark "Rye" <loaf>',
      url: 'https://proof.example/r/dark-rye',
      image: ['https://res.cloudinary.com/demo/rye.jpg'],
      prepTime: 'PT1H30M',
      cookTime: 'PT1H',
      totalTime: 'PT2H30M',
      recipeYield: '2 servings',
      recipeIngredient: ['500 g Rye flour', 'Salt, to taste'],
      author: { name: '@ada', url: 'https://proof.example/@ada' },
      aggregateRating: { ratingValue: 4.5, ratingCount: 2 },
    });
    expect(ld.recipeInstructions[0]).toEqual({ '@type': 'HowToStep', text: 'Mix.' });
  });

  it('does not publish the seed placeholder timing as a measurement, nor a rating with no votes', () => {
    const ld = jsonLdOf(recipeHead({ ...RYE, prepTime: '20 mins', cookTime: '30 mins', stats: { ratingSum: 0, ratingCount: 0 } }, 'https://p.example').tags);
    expect(ld.prepTime).toBeUndefined();
    expect(ld.totalTime).toBeUndefined();
    expect(ld.aggregateRating).toBeUndefined();
  });

  it("names a baker's page by name and handle", () => {
    const head = profileHead({ handle: 'ada', displayName: 'Ada', bio: '' }, { published: 3 }, 'https://p.example');
    expect(head.title).toBe('Ada (@ada) · Proof');
    expect(head.tags).toContain('content="3 recipes on Proof."');
  });
});
