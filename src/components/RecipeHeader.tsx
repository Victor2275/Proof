import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Globe, Lock, PencilLine } from 'lucide-react';
import type { PublishedRecipe, Recipe } from '../lib/types';
import { meaningfulDescription } from '../lib/description';
import { headnote } from '../lib/recipeText';
import { isPlaceholderTiming, parseDurationMinutes } from '../lib/duration';
import { factsLine } from '../lib/facts';
import { creditFromUrl, publicationState } from '../lib/publication';
import { usePublications } from '../lib/queries';
import { RecipePlate } from './ui';

/*
 * The top of a recipe, read like the top of a cookbook page (changes 58–62,
 * 66, 81, 82): the photograph, the title, a one-line headnote, and one line of
 * facts — "Serves 12 · Prep 20 min · Cook 1 h 15 · Medium".
 *
 * Times print only when they are real. The import script's "20 mins / 30
 * mins", which 199 recipes share, is not a measurement, so the line leaves
 * times out and a quiet "Add times" stands in.
 *
 * Under it, one line of provenance — where the recipe came from, as a credit
 * that opens the source — and, for a recipe of your own, where it stands with
 * the shared cookbook, as a chip that opens the publish sheet. The meter of
 * lit keys it replaces said the same thing in a language nobody spoke.
 */

interface RecipeHeaderProps {
  recipe: Recipe | PublishedRecipe;
  /** A recipe of the owner's: draws the publish chip and "Add times". */
  ownRecipe?: Recipe | null;
  /** Opens the publish sheet, from the chip. */
  onPublish?: () => void;
}

const CHIP_WORDS = {
  local: { words: 'Private · this device', Icon: Lock },
  pending: { words: 'Waiting for review', Icon: Clock },
  live: { words: 'Public', Icon: Globe },
  edits: { words: 'Public · edits not shared', Icon: PencilLine },
  rejected: { words: 'Held back', Icon: Lock },
} as const;

function PublishChip({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  const { byLocalId } = usePublications();
  const publication = byLocalId.get(recipe._id);
  const state = publicationState(recipe, publication);
  const { words, Icon } = CHIP_WORDS[state];
  return (
    <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="pressable inline-flex min-h-11 items-center"
      >
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-rule bg-paper-raised px-3 text-[0.8125rem] text-ink-2">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {words}
        </span>
      </button>
  );
}

export default function RecipeHeader({ recipe, ownRecipe, onPublish }: RecipeHeaderProps) {
  const forkedFrom = 'forkedFrom' in recipe ? recipe.forkedFrom : null;
  const shared = 'authorHandle' in recipe ? recipe : null;
  const description = headnote(meaningfulDescription(recipe.description));
  const facts = factsLine(recipe);
  const source = 'sourceUrl' in recipe ? recipe.sourceUrl : undefined;
  const sourceHost = creditFromUrl(source);
  const placeholder = isPlaceholderTiming(recipe) || (!parseDurationMinutes(recipe.prepTime) && !parseDurationMinutes(recipe.cookTime));

  return (
    <header className="flex flex-col">
      {/* Full width on a phone, edge to edge; a rounded plate on a wider page. */}
      <RecipePlate
        src={recipe.imageUrls?.[0]}
        alt={recipe.title}
        size="hero"
        eager
        className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-panel"
      />

      <div className="flex flex-col gap-2.5 pt-5">
        <h1 className="font-title text-[2.125rem] leading-[1.08] text-ink sm:text-[2.625rem]">{recipe.title}</h1>
        {description ? <p className="font-prose text-lg italic leading-snug text-ink-2">{description}</p> : null}
        {facts || (ownRecipe && placeholder) ? (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            {facts}
            {ownRecipe && placeholder ? (
              <Link
                to={`/edit/${ownRecipe._id}`}
                className="pressable -my-2 inline-flex min-h-11 items-center rounded-full px-1 font-medium text-ink-2 hover:text-ink"
              >
                {facts ? '· ' : ''}Add times
              </Link>
            ) : null}
          </p>
        ) : null}

        <div className="-ml-2.5 flex flex-wrap items-center gap-x-2">
          {shared ? (
            <Link
              to={`/@${shared.authorHandle}`}
              className="pressable inline-flex min-h-11 items-center rounded-full px-2.5 text-[0.8125rem] text-ink-muted hover:bg-paper-sunk hover:text-ink"
            >
              Shared by @{shared.authorHandle}
            </Link>
          ) : null}
          {forkedFrom ? (
            <Link
              to={`/r/${'slug' in forkedFrom ? forkedFrom.slug : forkedFrom.publishedId}`}
              className="pressable inline-flex min-h-11 items-center rounded-full px-2.5 text-[0.8125rem] text-ink-muted hover:bg-paper-sunk hover:text-ink"
            >
              Adapted from @{forkedFrom.authorHandle}
            </Link>
          ) : null}
          {sourceHost ? (
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Adapted from ${sourceHost}, opens in a new tab`}
              className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] text-ink-muted hover:bg-paper-sunk hover:text-ink"
            >
              Adapted from {sourceHost}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : shared?.sourceAttribution ? (
            <span className="px-2.5 text-[0.8125rem] text-ink-muted">From {shared.sourceAttribution}</span>
          ) : null}
          {ownRecipe && onPublish ? <PublishChip recipe={ownRecipe} onOpen={onPublish} /> : null}
        </div>
      </div>
    </header>
  );
}
