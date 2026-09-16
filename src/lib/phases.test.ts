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
    const phases = derivePhases([
      'Bulk ferment for 4 hours.',
      'Stretch and fold once an hour.',
      'Bake at 230C for 35 minutes.',
    ]);
    const bulk = phases.find((p) => p.id === 'bulk');
    expect(bulk?.stepIndices).toEqual([0, 1]);
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
});
