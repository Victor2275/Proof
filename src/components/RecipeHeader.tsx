import { useMemo } from 'react';
import type { Recipe } from '../lib/api';
import { derivePhases } from '../lib/phases';
import { parseDurationMinutes, totalRecipeMinutes, formatMinutesForSegments } from '../lib/duration';
import { RecipePlate, SegmentReadout, StepRow } from './ui';

/*
 * The recipe's masthead: title-led, with the photograph framed as a plate.
 *
 * The photograph is not the hero here and the choice is deliberate. A
 * full-bleed image at the top of a phone reads well in a screenshot and badly
 * in a kitchen — it pushes the ingredients, which are the reason the page was
 * opened, below the fold. The plate sits beside the instruments instead, at a
 * size that still shows what the thing looks like.
 *
 * Everything numeric is a segment readout, because every number here is an
 * instrument value: a duration, a count, a multiplier. The total goes first
 * and largest — it is the number that decides whether this bake happens today.
 */

interface RecipeHeaderProps {
  recipe: Recipe;
  heroImage?: string;
  scaleMultiplier: number;
}

/** A duration as it should read on a display, or "--" for a recipe that never said. */
function segments(raw: string | undefined) {
  const minutes = parseDurationMinutes(raw);
  return minutes === null ? { value: '--', unit: 'MIN' } : formatMinutesForSegments(minutes);
}

export default function RecipeHeader({ recipe, heroImage, scaleMultiplier }: RecipeHeaderProps) {
  const phases = useMemo(() => derivePhases(recipe.instructions), [recipe.instructions]);

  const total = totalRecipeMinutes(recipe);
  const totalSeg = total === null ? { value: '--', unit: 'MIN' } : formatMinutesForSegments(total);
  const prep = segments(recipe.prepTime);
  const cook = segments(recipe.cookTime);
  const servings = (recipe.servings || 4) * scaleMultiplier;

  return (
    <header className="flex flex-col gap-6 border-b border-rule pb-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {recipe.folder && recipe.folder !== 'Uncategorized' ? (
            <span className="label-silkscreen text-silkscreen">{recipe.folder}</span>
          ) : null}
          <span className="label-silkscreen text-ink-muted">{recipe.difficulty || 'Medium'}</span>
        </div>

        <h1 className="font-faceplate text-3xl leading-[1.05] text-ink sm:text-5xl">
          {recipe.title}
        </h1>

        {recipe.description ? (
          <p className="max-w-prose text-ink-muted">{recipe.description}</p>
        ) : null}
      </div>

      {/*
       * The plate sits beside the instruments at every width, including the
       * phone. Letting it go full-width on mobile turns it into the full-bleed
       * hero this page deliberately is not: a 390px-wide square is 390px tall,
       * and it pushes the ingredients — the reason the page was opened — clean
       * off the screen.
       */}
      <div className="flex gap-4 sm:gap-8">
        {/* Sized by the wrapper, never by the plate's own width class, so the
          * two never fight over which one the cascade honours. */}
        <div className="w-32 shrink-0 sm:w-56">
          <RecipePlate src={heroImage || recipe.imageUrls?.[0]} alt={recipe.title} size="hero" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <SegmentReadout label="Total" value={totalSeg.value} unit={totalSeg.unit} size="md" tone="ink" />
            <SegmentReadout label="Prep" value={prep.value} unit={prep.unit} size="sm" tone="ink" />
            <SegmentReadout label="Cook" value={cook.value} unit={cook.unit} size="sm" tone="ink" />
            {/* Servings lights up when the recipe is being scaled: the number
              * on screen is no longer the number the recipe was written at. */}
            <SegmentReadout
              label={scaleMultiplier === 1 ? 'Serves' : `Serves · ${scaleMultiplier}×`}
              value={servings}
              size="sm"
              tone={scaleMultiplier === 1 ? 'ink' : 'signal'}
            />
          </div>

          {/* Tags stay beside the plate: they are a caption on the recipe, not
            * a control, and they read at any column width. */}
          {recipe.tags && recipe.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <li
                  key={tag}
                  className="label-silkscreen rounded-key border border-rule px-2 py-1 text-ink-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* The method, as the shape of the bake — full width, because the row is
        * the one thing on this page that has to stay one unbroken line. The
        * same row appears in the dashboard list and again in Baking Mode with a
        * key lit; this is where a baker learns to read it. */}
      <StepRow phases={phases} label={`${recipe.title} phases`} />
    </header>
  );
}
