import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { Component, Recipe } from '../../lib/types';
import { totalRecipeMinutes, formatMinutes, isPlaceholderTiming } from '../../lib/duration';
import { RecipePlate } from './RecipePlate';
import { Tag } from './Tag';

/*
 * A tile in the cookbook: the photograph, the name, and one quiet line.
 *
 * A cookbook is browsed before it is searched — the first question is "what
 * do I feel like making", and a photograph answers it faster than any amount
 * of metadata. So a tile is the picture, a title in the serif that wraps to
 * two lines rather than truncating mid-word, and one line of facts.
 *
 * The line says only what the recipe can prove: its chapter, and its time
 * when the time is real. The import script's placeholder "50 minutes" on 199
 * recipes is not printed — a library telling the same lie 199 times is worse
 * than one saying nothing — and the ingredient count stands in.
 *
 * The whole tile is one link and one press. It never scales on hover, so a
 * grid cannot shift under a cursor while someone reads it.
 */

/** Enough of a recipe to draw a tile: a local recipe, or a shared one's summary. */
export type TileRecipe = Pick<Recipe, '_id' | 'title' | 'imageUrls' | 'prepTime' | 'cookTime' | 'folder'> & {
  instructions?: string[];
  ingredients?: Component[];
};

export interface RecipeTileProps {
  recipe: TileRecipe;
  /** Where the tile goes. A recipe in the cookbook by default. */
  to?: string;
  /** Edges the photograph in the accent: this is the bake running right now. */
  active?: boolean;
  /** A short fact beside the title: Public for a recipe in the shared cookbook. */
  tag?: string;
  className?: string;
}

export function RecipeTile({ recipe, to, active = false, tag, className }: RecipeTileProps) {
  const minutes = isPlaceholderTiming(recipe) ? null : totalRecipeMinutes(recipe);
  const ingredientCount = recipe.ingredients?.length ?? 0;
  const folder = recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : 'Recipe';

  // One string rather than several nodes, so it reads, and tests, as the
  // single line it looks like.
  const caption =
    minutes !== null
      ? `${folder} · ${formatMinutes(minutes)}`
      : ingredientCount > 0
        ? `${folder} · ${ingredientCount} ingredients`
        : folder;

  return (
    <Link
      to={to ?? `/recipe/${recipe._id}`}
      className={cn('pressable group flex flex-col gap-2 rounded-key', className)}
    >
      <RecipePlate
        src={recipe.imageUrls?.[0]}
        alt={recipe.title}
        size="hero"
        className={cn(active && 'ring-2 ring-accent ring-offset-2 ring-offset-paper')}
      />
      <div className="flex flex-col gap-0.5">
        <h3 className="font-title line-clamp-2 text-[1.0625rem] leading-snug text-ink group-hover:underline group-hover:decoration-rule-strong group-hover:underline-offset-4">
          {recipe.title}
        </h3>
        <p className="text-xs text-ink-muted">{caption}</p>
      </div>
      {tag ? <Tag className="self-start">{tag}</Tag> : null}
    </Link>
  );
}
