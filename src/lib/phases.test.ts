import { describe, it, expect } from 'vitest';
import { derivePhases, phaseState, derivePhasesWithReading } from './phases';

const SOURDOUGH = [
  'Feed the starter and leave the levain to ripen for 6 hours.',
  'Mix the flour and water and let it autolyse for 1 hour.',
  'Add the salt and mix until the dough comes together.',
  'Bulk ferment for 4 hours, with a stretch and fold every 45 minutes.',
  'Pre-shape the dough and rest for 20 minutes.',
  'Shape into a boule.',
  'Retard in the banneton overnight in the refrigerator.',
  'Preheat the dutch oven to 250C.',
  'Score the loaf and bake for 20 minutes covered.',
  'Cool on a wire rack for at least 2 hours before slicing.',
];

const SOUP = [
  'Dice the onions and carrots.',
  'Season the chicken thighs.',
  'Sear the chicken until browned.',
  'Simmer for 40 minutes.',
  'Garnish with parsley and serve.',
];

describe('derivePhases', () => {
  it('reads a sourdough bake as its real phases in order', () => {
    const phases = derivePhases(SOURDOUGH);
    expect(phases.map((p) => p.id)).toEqual([
      'levain',
      'autolyse',
      'mix',
      'bulk',
      'shape',
      'proof',
      'bake',
      'rest',
    ]);
  });

  it('assigns every instruction to exactly one phase', () => {
    const phases = derivePhases(SOURDOUGH);
    const assigned = phases.flatMap((p) => p.stepIndices).sort((a, b) => a - b);
    expect(assigned).toEqual(SOURDOUGH.map((_, i) => i));
  });

  it('keeps phases monotonic, never jumping backwards', () => {
    const phases = derivePhases(SOURDOUGH);
    const firsts = phases.map((p) => p.stepIndices[0]);
    expect([...firsts].sort((a, b) => a - b)).toEqual(firsts);
  });

  it('stays within a legible key count', () => {
    // The whole reason a phase is the unit: a phone propped across a counter
    // cannot resolve thirty keys.
    expect(derivePhases(SOURDOUGH).length).toBeLessThanOrEqual(10);
  });

  it('groups consecutive steps of one phase into a single key', () => {
    // A bread names what makes it rise; without the levain this would read generic.
    const phases = derivePhases([
      'Mix the ripe levain into the dough.',
      'Bulk ferment for 4 hours.',
      'Stretch and fold once an hour.',
      'Bake at 230C for 35 minutes.',
    ]);
    const bulk = phases.find((p) => p.id === 'bulk');
    expect(bulk?.stepIndices).toEqual([1, 2]);
  });

  it('falls back to a generic vocabulary for a recipe that is not bread', () => {
    const phases = derivePhases(SOUP);
    expect(phases.map((p) => p.id)).toEqual(['prep', 'cook', 'finish']);
  });

  it('returns nothing for a recipe with no instructions', () => {
    expect(derivePhases([])).toEqual([]);
    expect(derivePhases(undefined)).toEqual([]);
    expect(derivePhases(null)).toEqual([]);
  });
});

describe('phaseState', () => {
  const phases = derivePhases(SOURDOUGH);
  const byId = (id: string) => phases.find((p) => p.id === id)!;

  it('leaves every phase idle when no bake is running', () => {
    expect(phases.every((p) => phaseState(p) === 'idle')).toBe(true);
  });

  it('marks the running phase now and finished phases done', () => {
    // Step 3 is the bulk ferment.
    expect(phaseState(byId('bulk'), 3)).toBe('now');
    expect(phaseState(byId('levain'), 3)).toBe('done');
    expect(phaseState(byId('mix'), 3)).toBe('done');
  });

  it('marks only the phase immediately ahead as due', () => {
    expect(phaseState(byId('shape'), 3)).toBe('due');
    expect(phaseState(byId('proof'), 3)).toBe('queued');
    expect(phaseState(byId('bake'), 3)).toBe('queued');
  });

  it('never reports two phases as now at once', () => {
    for (let step = 0; step < SOURDOUGH.length; step++) {
      const running = phases.filter((p) => phaseState(p, step) === 'now');
      expect(running).toHaveLength(1);
    }
  });
});

describe('derivePhasesWithReading', () => {
  it('reports a bread reading when the recipe proved it', () => {
    const result = derivePhasesWithReading([
      'Feed the levain and let it ripen.',
      'Bulk ferment for 4 hours.',
      'Bake at 250C.',
    ]);
    expect(result.reading).toBe('bread');
    expect(result.phases.map((p) => p.id)).toContain('levain');
  });

  it('reports a generic reading for a recipe that named nothing specific', () => {
    // Prep/cook/finish is true of almost any recipe, so a surface can use this
    // to decide the phases are not worth drawing.
    const result = derivePhasesWithReading(['Chop the onion.', 'Simmer for an hour.', 'Serve.']);
    expect(result.reading).toBe('generic');
  });

  it('reports no reading at all for a recipe with no instructions', () => {
    expect(derivePhasesWithReading([]).reading).toBe('none');
    expect(derivePhasesWithReading(undefined).reading).toBe('none');
  });

  /*
   * Regressions from the live library. The previous rule filed eighteen of its
   * recipes as bread — a beef arepa opened baking mode on LEVAIN — NOW — while
   * the Danish rye read generic. A bread is a leavened dough that rises.
   */
  describe('against the live library', () => {
    it('does not read a beef arepa as bread because its dough is divided and shaped', () => {
      const result = derivePhasesWithReading([
        'Cook the meat: place the flank steak in a pot with broth and cook over low heat for about 2 hours.',
        'Shred the meat using two forks.',
        'Make the dough: in a bowl, mix the cornmeal with warm water and salt.',
        'Form the arepas: divide the dough into 6 portions and shape into balls.',
        'Cook the arepas on a griddle over medium heat.',
        'Fill: slice the arepas open and fill with the shredded beef.',
      ]);
      expect(result.reading).toBe('generic');
      expect(result.phases.map((p) => p.id)).not.toContain('levain');
    });

    it('does not treat a steak marinated overnight as proofed', () => {
      const result = derivePhasesWithReading([
        'Marinate the steak overnight.',
        'Mix the breadcrumbs and shape into patties.',
        'Fry until golden.',
      ]);
      expect(result.reading).toBe('generic');
    });

    it('reads a home-yeasted bread that says "let it rise" rather than "bulk"', () => {
      const result = derivePhasesWithReading([
        'Dissolve the yeast in the warm milk.',
        'Knead for 10 minutes until smooth.',
        'Cover and leave to rise until doubled.',
        'Shape into a braid.',
        'Bake at 190C for 30 minutes.',
      ]);
      expect(result.reading).toBe('bread');
      expect(result.phases.map((p) => p.id)).toEqual(['mix', 'bulk', 'shape', 'bake']);
    });

    it('files an unnamed opening step under the phase the bread actually starts in, not Levain', () => {
      const result = derivePhasesWithReading([
        'Warm the milk.',
        'Add the yeast and knead the dough.',
        'Let the dough rise for an hour.',
        'Bake until golden.',
      ]);
      expect(result.phases[0]).toEqual({ id: 'mix', label: 'Mix', stepIndices: [0, 1] });
    });

    it('counts a rise named in a step that was filed under an earlier phase', () => {
      // "Mix … shape … let rise" is filed under Mix, but it still proves the rise.
      const result = derivePhasesWithReading([
        'Mix the semolina, sugar, yeast and salt.',
        'Mix the dough, shape into a round loaf and let rise for 1 hour.',
        'Bake until golden brown.',
      ]);
      expect(result.reading).toBe('bread');
    });

    it('reads a bread whose steps all collapse into one phase as generic', () => {
      // The first step mentions the oven, assignment cannot move backwards,
      // and every step would be "Bake" — a one-key row that says nothing.
      const result = derivePhasesWithReading([
        'Preheat the oven to 220C.',
        'Combine the flour and yeast.',
        'Let it rise until doubled.',
      ]);
      expect(result.reading).toBe('generic');
    });

    it('keeps an unnamed opening step in Prep for a recipe that is not bread', () => {
      const result = derivePhasesWithReading([
        'Put the prawns in a bowl.',
        'Heat the wok and fry for two minutes.',
      ]);
      expect(result.phases[0]).toEqual({ id: 'prep', label: 'Prep', stepIndices: [0] });
    });
  });
});
