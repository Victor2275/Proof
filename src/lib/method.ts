import { derivePhases, derivePhasesWithReading, type Phase } from './phases';
import { hasWrittenSections, methodSections, methodSteps, type MethodSection } from './recipeText';

/*
 * How a method is divided, for the two places that divide it.
 *
 * The recipe's own headings ("--- Crust ---") always win. Without them, the
 * recipe page prints subheads only for a bread whose wording proves its
 * phases — "Prep / Cook / Finish" over a soup is a heading that says nothing —
 * while baking mode's progress line always has its named ticks, generic or
 * not, because there they mark how far along the bake is.
 */

/** The sections the recipe page prints the method under. */
export function printedSections(instructions: string[] | undefined): MethodSection[] {
  const written = methodSections(instructions);
  if (hasWrittenSections(instructions)) return written;
  const { phases, reading } = derivePhasesWithReading(instructions ?? []);
  if (reading !== 'bread' || phases.length < 2) return written;
  const steps = written.flatMap((s) => s.steps);
  return phases
    .map((phase) => ({ heading: phase.label, steps: steps.filter((s) => phase.stepIndices.includes(s.index)) }))
    .filter((s) => s.steps.length > 0);
}

/** The named ticks on baking mode's progress line, over real steps only. */
export function bakePhases(instructions: string[] | undefined): Phase[] {
  if (hasWrittenSections(instructions)) {
    return methodSections(instructions).map((s, i) => ({
      id: `section-${i}`,
      label: s.heading ?? 'Start',
      stepIndices: s.steps.map((step) => step.index),
    }));
  }
  const real = new Set(methodSteps(instructions).map((s) => s.index));
  return derivePhases(instructions)
    .map((p) => ({ ...p, stepIndices: p.stepIndices.filter((i) => real.has(i)) }))
    .filter((p) => p.stepIndices.length > 0);
}
