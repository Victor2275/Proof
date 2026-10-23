import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { InstructionLink, StepNote } from '../lib/types';
import { printedSections } from '../lib/method';
import StepText from './StepText';
import { MarginNote } from './ui';

/*
 * The method, printed in full (changes 77–80, 84, 93).
 *
 * Every step is shown whole; "Read more" truncated about half of them. Steps
 * are grouped under the recipe's own headings ("--- Crust ---" lines), or,
 * for a bread whose wording proves its phases, under those. A recipe that
 * names neither is one run of numbered steps rather than three invented
 * headings. Numbers count real steps only, and mean the same step here as in
 * baking mode.
 *
 * Under a step, in pencil: what the last bake noted about it. Beside it, any
 * sub-recipe it calls for, as "See also".
 */

export interface InstructionListProps {
  recipe: { title: string; instructions?: string[]; instructionLinks?: InstructionLink[] };
  /** The most recent note for each step, keyed by its index in `instructions`. */
  marginNotes?: Map<number, StepNote>;
  onOpenSubRecipe?: (recipeId: string) => void;
  /** The cookbook's own recipe: its step timers then lead back to baking mode. */
  recipeId?: string;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function InstructionList({ recipe, marginNotes, onOpenSubRecipe, recipeId }: InstructionListProps) {
  const sections = useMemo(() => printedSections(recipe.instructions), [recipe.instructions]);

  return (
    <section aria-labelledby="method-heading" className="flex flex-col">
      <h2 id="method-heading" className="font-title flex min-h-11 items-center border-b border-rule pb-2.5 text-2xl text-ink">
        Method
      </h2>
      {sections.length === 0 ? (
        <p className="pt-4 text-ink-muted">No method written yet.</p>
      ) : null}
      {sections.map((section, s) => (
        <div key={`${section.heading ?? ''}-${s}`} className="flex flex-col">
          {section.heading ? (
            <h3 className="font-title mt-5 text-[1.1875rem] italic text-ink-2">{section.heading}</h3>
          ) : null}
          <ol className="flex flex-col">
            {section.steps.map((step) => {
              const note = marginNotes?.get(step.index);
              const links = (recipe.instructionLinks ?? []).filter((l) => l.stepIndex === step.index);
              return (
                <li key={step.index} value={step.number} className="flex flex-col gap-1.5 py-3">
                  <div className="flex gap-3.5">
                    <span aria-hidden="true" className="font-title w-6 shrink-0 text-xl leading-[1.35] text-ink-muted">
                      {step.number}
                    </span>
                    <p className="font-prose min-w-0 flex-1 text-[1.0625rem] leading-relaxed text-ink">
                      <span className="sr-only">Step {step.number}. </span>
                      <StepText
                        text={step.text}
                        name={`Step ${step.number}`}
                        from={recipeId ? { recipeId, step: step.number } : undefined}
                      />
                    </p>
                  </div>
                  {note ? (
                    <MarginNote lead={shortDate(note.at)} className="ml-[2.375rem]">
                      {note.text}
                    </MarginNote>
                  ) : null}
                  {links.length && onOpenSubRecipe ? (
                    <div className="ml-[2.375rem] flex flex-wrap gap-x-2">
                      {links.map((link) => (
                        <button
                          key={link.recipeId}
                          type="button"
                          onClick={() => onOpenSubRecipe(link.recipeId)}
                          className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-ink-2 hover:bg-paper-sunk"
                        >
                          See also: <span className="font-medium text-ink">{link.recipeTitle}</span>
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
