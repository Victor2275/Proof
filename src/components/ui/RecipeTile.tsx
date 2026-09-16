import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { Recipe } from '../../lib/api';
import { derivePhasesWithReading } from '../../lib/phases';
import {
  totalRecipeMinutes,
  formatMinutesForSegments,
  isPlaceholderTiming,
} from '../../lib/duration';
import { RecipePlate } from './RecipePlate';
import { SegmentReadout } from './SegmentReadout';
import { StepRow } from './StepRow';

/*
 * A tile in the cookbook: the photograph, and its name underneath.
 *
 * At rest that is all it is. A cookbook is browsed before it is searched — the
 * first question is "what do I feel like making", and a photograph answers that
 * faster than any amount of metadata. Time, bake type and phases are the second
 * question, so they wait for a hover.
 *
 * The reveal is a flat panel sliding up over the lower half of the image. It
 * does not scale the tile: a grid where the thing under the cursor grows is a
 * grid that shifts under you while you read it. The tile's border lights
 * instead, the same way a key does, so the highlight costs no layout at all.
 *
 * What the panel shows is what the recipe can prove. A step row is drawn only
 * where the instructions actually named a bread bake's phases; a time only
 * where it is not the import script's placeholder. Everything else falls back
 * to two facts that are always true — the bake type, and how many ingredients
 * it takes. A grid of 203 identical "PREP COOK FINISH · 50 MIN" tiles would
 * look informative and say nothing.
 */

export interface RecipeTileProps {
  recipe: Recipe;
  /** Lights the tile: this is the bake running right now. */
  active?: boolean;
  className?: string;
}

export function RecipeTile({ recipe, active = false, className }: RecipeTileProps) {
  const { phases, reading } = useMemo(
    () => derivePhasesWithReading(recipe.instructions),
    [recipe.instructions],
  );

  const showPhases = reading === 'bread' && phases.length > 0;

  const minutes = isPlaceholderTiming(recipe) ? null : totalRecipeMinutes(recipe);
  const segment = minutes === null ? null : formatMinutesForSegments(minutes);

  const ingredientCount = recipe.ingredients?.length ?? 0;
  const folder = recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : null;

  // Built as one string rather than two nodes so it reads, and tests, as the
  // single line it looks like.
  const caption =
    ingredientCount > 0 && !showPhases
      ? `${folder ?? 'Recipe'} · ${ingredientCount} ingredients`
      : (folder ?? 'Recipe');

  return (
    <Link
      to={`/recipe/${recipe._id}`}
      className={cn('group flex flex-col gap-2 focus:outline-none', className)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-key border transition-colors',
          active ? 'border-signal' : 'border-rule group-hover:border-ink group-focus-visible:border-ink',
        )}
      >
        <RecipePlate src={recipe.imageUrls?.[0]} alt={recipe.title} size="hero" />

        {/*
         * The reveal. Mounted always so the slide has something to animate, and
         * pointer-events-none so it never intercepts the click that the whole
         * tile is. Touch devices never fire hover and simply keep the clean
         * photo-and-title tile.
         *
         * Not aria-hidden. Hiding it would be the easy reading — it is only
         * visible on hover, so it looks decorative — but hover is not available
         * to a keyboard or a screen reader at all, so marking it hidden would
         * mean those users are the only ones who can never reach the bake time
         * or the phases. The panel is part of the tile's one announcement.
         */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 translate-y-full',
            'border-t border-rule bg-panel faceplate px-3 py-2.5',
            'transition-transform duration-150 ease-out',
            'group-hover:translate-y-0 group-focus-visible:translate-y-0',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="label-silkscreen truncate text-silkscreen">{caption}</span>
            {segment ? (
              <SegmentReadout value={segment.value} unit={segment.unit} size="sm" tone="ink" />
            ) : null}
          </div>

          {showPhases ? (
            <div className="mt-2">
              <StepRow phases={phases} size="mini" label={`${recipe.title} phases`} />
            </div>
          ) : null}
        </div>
      </div>

      <h3
        className={cn(
          'font-faceplate line-clamp-2 text-sm leading-tight transition-colors sm:text-base',
          active ? 'text-signal' : 'text-ink',
        )}
      >
        {recipe.title}
      </h3>
    </Link>
  );
}
