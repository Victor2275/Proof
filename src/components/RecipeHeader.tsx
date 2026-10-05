import { useMemo } from 'react';
import type { Recipe } from '../lib/api';
import { derivePhases } from '../lib/phases';
import { meaningfulDescription } from '../lib/description';
import {
  parseDurationMinutes,
  totalRecipeMinutes,
  formatMinutesForSegments,
  isPlaceholderTiming,
} from '../lib/duration';
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

  /*
   * The same rule the cookbook uses: an import script's "20 mins" / "30 mins"
   * default is not a measurement, and 199 recipes share it verbatim. An unlit
   * display is honest about not knowing; a fabricated 50 MIN is not, and it is
   * worse here than in the gallery, because this is the screen someone plans an
   * afternoon from.
   */
  const placeholder = isPlaceholderTiming(recipe);
  const total = placeholder ? null : totalRecipeMinutes(recipe);
  const totalSeg = total === null ? { value: '--', unit: 'MIN' } : formatMinutesForSegments(total);
  const prep = placeholder ? { value: '--', unit: 'MIN' } : segments(recipe.prepTime);
  const cook = placeholder ? { value: '--', unit: 'MIN' } : segments(recipe.cookTime);
  const servings = (recipe.servings || 4) * scaleMultiplier;

  return (
    <header className="flex flex-col gap-6">
      {/* The title opens the page. Folder and difficulty used to sit above it
        * as a kicker; they classify the recipe, so they moved down beside the
        * tags, which do the same job. */}
      <div className="flex flex-col gap-3">
        <h1 className="font-faceplate text-3xl leading-[1.05] text-ink sm:text-5xl">
          {recipe.title}
        </h1>

        {/* The seed script's "A delicious {area} {category} dish." is not a
          * description, so it is not printed as one. */}
        {meaningfulDescription(recipe.description) ? (
          <p className="max-w-prose text-ink-muted">{meaningfulDescription(recipe.description)}</p>
        ) : null}
      </div>

      {/*
       * The plate sits beside the instruments at every width, including the
       * phone. Letting it go full-width on mobile turns it into the full-bleed
       * hero this page deliberately is not: a 390px-wide square is 390px tall,
       * and it pushes the ingredients — the reason the page was opened — clean
       * off the screen.
       *
       * A grid rather than a row because the step row changes place with the
       * page's width. In a narrow column it runs full width under the plate.
       * Once the page reaches 48rem, it moves into the plate's own column and
       * sits on the plate's bottom edge. There it fills the height the readouts
       * left empty, and seven keys still fit on one unbroken line.
       */}
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-8">
        {/* Sized by the grid track, never by the plate's own width class, so
          * the two never fight over which one the cascade honours. */}
        <div className="@3xl:row-span-2">
          <RecipePlate src={heroImage || recipe.imageUrls?.[0]} alt={recipe.title} size="hero" />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <SegmentReadout label="Total" value={totalSeg.value} unit={totalSeg.unit} size="md" tone="ink" />
            <SegmentReadout label="Prep" value={prep.value} unit={prep.unit} size="sm" tone="ink" />
            <SegmentReadout label="Cook" value={cook.value} unit={cook.unit} size="sm" tone="ink" />
            {/* A scaled recipe says so in its label: the number on screen is no
              * longer the number the recipe was written at. It does not light
              * up — scaling is a setting, not something happening now, and red
              * here was a second "now" beside the Start key. */}
            <SegmentReadout
              label={scaleMultiplier === 1 ? 'Serves' : `Serves · ${scaleMultiplier}×`}
              value={servings}
              size="sm"
              tone="ink"
            />
          </div>

          {/* Classification stays beside the plate. Folder, difficulty and
            * tags are captions on the recipe, not controls, and they read at
            * any column width. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {recipe.folder && recipe.folder !== 'Uncategorized' ? (
              <span className="label-silkscreen text-silkscreen">{recipe.folder}</span>
            ) : null}
            <span className="label-silkscreen text-ink-muted">{recipe.difficulty || 'Medium'}</span>
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

        {/* The method, as the shape of the bake, and the one thing in the
          * masthead that has to stay one unbroken line. The same row appears
          * in the dashboard list and again in Baking Mode with a key lit; this
          * is where a baker learns to read it. */}
        <StepRow
          phases={phases}
          label={`${recipe.title} phases`}
          className="col-span-2 @3xl:col-span-1 @3xl:self-end"
        />
      </div>
    </header>
  );
}
