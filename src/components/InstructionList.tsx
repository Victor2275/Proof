import { useMemo } from 'react';
import type { Recipe } from '../lib/api';
import ExpandableInstruction from './ExpandableInstruction';
import { derivePhases } from '../lib/phases';

/*
 * The method, grouped under the phases the step row shows.
 *
 * The dashboard and Baking Mode both draw a recipe as a row of phase keys.
 * This is the only surface where a baker can see which instructions those keys
 * stand for, so the steps are printed under silkscreened phase headings rather
 * than as one flat run of numbers. Steps keep their absolute numbering across
 * the whole recipe — "step 7" has to mean the same thing here as it does in
 * Baking Mode.
 */

interface InstructionListProps {
  recipe: Recipe;
}

export default function InstructionList({ recipe }: InstructionListProps) {
  const steps = recipe.instructions || [];
  const phases = useMemo(() => derivePhases(steps), [steps]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label-silkscreen border-b border-rule pb-2">Method</h2>

      <div className="flex flex-col gap-6">
        {phases.map((phase) => (
          <div key={phase.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* An unlit key beside the heading: this phase is not running.
                * Baking Mode is where it lights. */}
              <span className="h-2.5 w-2.5 shrink-0 rounded-key bg-key-unlit" aria-hidden="true" />
              <h3 className="label-silkscreen text-silkscreen">{phase.label}</h3>
            </div>
            <ol className="flex flex-col gap-4">
              {phase.stepIndices.map((stepIndex) => (
                <ExpandableInstruction key={stepIndex} text={steps[stepIndex]} index={stepIndex} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
