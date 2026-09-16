import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, Shuffle } from 'lucide-react';
import { type Recipe, type BakeLog } from '../lib/api';
import { useRecipes, useBakeLogs } from '../lib/queries';
import { useActiveBake } from '../lib/useActiveBake';
import { derivePhases } from '../lib/phases';
import { totalRecipeMinutes, formatMinutesForSegments } from '../lib/duration';
import { Button, Field, StepRow, SegmentReadout, RecipePlate, buttonClassName } from './ui';
import OnboardingModal from './OnboardingModal';

/*
 * The hero surface. A recipe reads as a pattern — its photograph on a plate,
 * its title, its total time as a segment readout, and its method as a
 * miniature step row — rather than as a photo card in a grid. The plate makes
 * the library warm to arrive at; the pattern beside it is what makes the
 * library scannable, and it carries the row on its own if an image is missing.
 * One row, and only one, carries a lit key: the bake actually running now.
 */

const EMPTY_RECIPES: Recipe[] = [];
const EMPTY_LOGS: BakeLog[] = [];
const ALL_BANK = '__all__';
const SHELF_LIMIT = 8;

function bakeLogRecipeId(log: BakeLog): string {
  return typeof log.recipeId === 'string' ? log.recipeId : log.recipeId._id;
}

function bakeLogDate(log: BakeLog): number {
  return log.date ? new Date(log.date).getTime() : 0;
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** A pattern in a shelf: title + mini step row, no card, no border. */
function ShelfItem({ recipe, caption }: { recipe: Recipe; caption: string }) {
  return (
    <Link to={`/recipe/${recipe._id}`} className="flex w-40 shrink-0 flex-col gap-2 sm:w-48">
      <RecipePlate src={recipe.imageUrls?.[0]} alt={recipe.title} size="tile" />
      <h3 className="font-faceplate truncate text-sm text-ink">{recipe.title}</h3>
      <StepRow phases={derivePhases(recipe.instructions)} size="mini" />
      <span className="label-silkscreen text-ink-muted">{caption}</span>
    </Link>
  );
}

function Shelf({
  title,
  items,
  caption,
}: {
  title: string;
  items: { recipe: Recipe; caption: string }[];
  caption: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-silkscreen border-b border-rule pb-2">{title}</h2>
      <div className="no-scrollbar flex gap-5 overflow-x-auto pb-1">
        {items.map(({ recipe, caption: itemCaption }) => (
          <ShelfItem key={recipe._id} recipe={recipe} caption={itemCaption ?? caption} />
        ))}
      </div>
    </section>
  );
}

/** One row of the main list — the pattern itself. */
function PatternRow({
  recipe,
  isActive,
  activeStep,
}: {
  recipe: Recipe;
  isActive: boolean;
  activeStep?: number;
}) {
  const phases = useMemo(() => derivePhases(recipe.instructions), [recipe.instructions]);
  const totalMinutes = totalRecipeMinutes(recipe);
  const segment = totalMinutes !== null ? formatMinutesForSegments(totalMinutes) : null;

  return (
    <div className="flex flex-col gap-2.5 border-b border-rule py-4">
      {/*
       * One link for the whole pattern rather than two. An earlier version
       * split this into a title link plus a second, aria-hidden link around
       * the step row meant only to widen the click target for a mouse — but
       * aria-hidden removes its entire subtree from the accessibility tree,
       * which silently deleted the step row's own accessible description
       * (its phase list) for anyone using a screen reader, not merely the
       * redundant second link. A single link whose content is the title, the
       * time, and the step row together gives one coherent announcement
       * ("Sourdough Bread, Bake phases: Levain, Bulk, Bake, link") and still
       * makes the entire row clickable.
       */}
      <Link to={`/recipe/${recipe._id}`} className="flex gap-3 sm:gap-4">
        <RecipePlate src={recipe.imageUrls?.[0]} alt={recipe.title} size="row" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Wraps to a second line rather than truncating: at 390px beside
                * a plate, "Mini Bundt Cakes" would lose half its name, and a
                * recipe a baker cannot identify is not a row worth listing. */}
              <h3 className="font-faceplate line-clamp-2 text-xl text-ink sm:text-2xl">{recipe.title}</h3>
              {recipe.folder && recipe.folder !== 'Uncategorized' ? (
                <span className="label-silkscreen text-ink-muted">{recipe.folder}</span>
              ) : null}
            </div>
            <SegmentReadout
              value={segment?.value ?? '--'}
              unit={segment?.unit}
              size="sm"
              tone={isActive ? 'signal' : 'ink'}
            />
          </div>
          <StepRow phases={phases} activeStep={activeStep} />
        </div>
      </Link>

      {isActive ? (
        <Link
          to={`/recipe/${recipe._id}/bake`}
          className={buttonClassName({ variant: 'primary', size: 'sm', className: 'self-start' })}
        >
          Resume
        </Link>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const { data: allRecipes = EMPTY_RECIPES, isLoading, error, refetch } = useRecipes();
  // Best-effort: the smart shelves are a secondary enhancement, not the
  // dashboard's primary function, so a failed fetch here quietly hides the
  // shelves rather than breaking the recipe list.
  const { data: bakeLogs = EMPTY_LOGS } = useBakeLogs();
  const activeBake = useActiveBake();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [bank, setBank] = useState<string>(ALL_BANK);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadError = error instanceof Error ? error.message : null;

  useEffect(() => {
    if (localStorage.getItem('hasVisited') === 'true' && !localStorage.getItem('hasSeenOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const banks = useMemo(() => {
    const counts = new Map<string, number>();
    allRecipes.forEach((r: Recipe) => {
      const name = r.folder || 'Uncategorized';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allRecipes]);

  const bankFiltered = useMemo(
    () => (bank === ALL_BANK ? allRecipes : allRecipes.filter((r: Recipe) => (r.folder || 'Uncategorized') === bank)),
    [allRecipes, bank],
  );

  const recipes = useMemo(() => {
    if (!search.trim()) return bankFiltered;
    const fuse = new Fuse(bankFiltered, { keys: ['title', 'description', 'tags'], threshold: 0.3, ignoreLocation: true });
    return fuse.search(search).map((r) => r.item as Recipe);
  }, [search, bankFiltered]);

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    allRecipes.forEach((r: Recipe) => { if (r._id) map.set(r._id, r); });
    return map;
  }, [allRecipes]);

  const showShelves = !search.trim() && bank === ALL_BANK;

  const personalBests = useMemo(() => {
    if (!showShelves) return [];
    const seen = new Set<string>();
    const result: { recipe: Recipe; caption: string }[] = [];
    [...bakeLogs]
      .filter((l) => l.isPersonalBest)
      .sort((a, b) => bakeLogDate(b) - bakeLogDate(a))
      .forEach((log) => {
        const id = bakeLogRecipeId(log);
        const recipe = recipesById.get(id);
        if (recipe && !seen.has(id)) {
          seen.add(id);
          result.push({ recipe, caption: 'Personal best' });
        }
      });
    return result.slice(0, SHELF_LIMIT);
  }, [showShelves, bakeLogs, recipesById]);

  const recentlyBaked = useMemo(() => {
    if (!showShelves) return [];
    const seen = new Set<string>();
    const result: { recipe: Recipe; caption: string }[] = [];
    [...bakeLogs]
      .sort((a, b) => bakeLogDate(b) - bakeLogDate(a))
      .forEach((log) => {
        const id = bakeLogRecipeId(log);
        const recipe = recipesById.get(id);
        if (recipe && !seen.has(id)) {
          seen.add(id);
          result.push({ recipe, caption: log.date ? relativeDate(log.date) : '' });
        }
      });
    return result.slice(0, SHELF_LIMIT);
  }, [showShelves, bakeLogs, recipesById]);

  const activeRecipe = activeBake ? recipesById.get(activeBake.recipeId) : undefined;

  const handleInspireMe = () => {
    if (recipes.length === 0) return;
    const random = recipes[Math.floor(Math.random() * recipes.length)];
    navigate(`/recipe/${random._id}`);
  };

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

      <div className="flex flex-col gap-4 border-b border-rule pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-faceplate text-3xl text-ink md:text-4xl">
            {bank !== ALL_BANK ? bank : 'My Cookbook'}
          </h1>
          <p className="label-silkscreen text-ink-muted">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <Field
            label="Search"
            hideLabel
            leading={<Search className="h-4 w-4" />}
            placeholder="Search recipes or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-72"
          />
          {allRecipes.length > 0 && (
            <Button variant="secondary" onClick={handleInspireMe} icon={<Shuffle className="h-4 w-4" />}>
              <span className="hidden sm:inline">Inspire Me</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bank rail: vertical on desktop, a horizontal scroller on a phone
        * screen too narrow for a second sidebar. The row never wraps — it
        * scales, the same rule the step row itself follows.
        *
        * This whole layout renders unconditionally — including while loading
        * or errored, when `banks` (derived from the still-empty recipe list)
        * has nothing in it yet. Gating it on `banks.length` would have hidden
        * the loading skeleton, the error state, and the empty state along
        * with the rail, which is the one state where a baker most needs to
        * see *something* on screen. */}
      {/*
       * `items-start` matters, not just style: a plain flex row defaults to
       * `align-items: stretch`, which was silently forcing the rail to match
       * the content column's full height — invisible on desktop only because
       * the rail has no background to show it, but at 203 unvirtualized rows
       * that meant a ~30,000px-tall nav element sitting in the page. Below
       * `lg` the direction flips to column so the rail becomes a horizontal
       * scroller sitting above the content instead of squeezed beside it —
       * the "vertical on desktop, horizontal on mobile" comment above never
       * actually flipped this outer container, only the nav's own internals,
       * so on a phone it tried to lay out at its full unwrapped content width
       * (native flex `min-width: auto` beats a plain `overflow-x-auto`) next
       * to the content column instead of above it.
       *
       * `items-start` is `lg:`-only, not universal: stacked on mobile (a
       * column), the default stretch is exactly right — it is what makes the
       * rail and the content column both span the full width. Applying
       * `items-start` there instead flips the cross axis to shrink-to-fit,
       * and the content column's intrinsic width is its *desktop* row shape
       * (title + segment readout side by side, ~1190px) — so the column
       * would size itself to that and silently overflow the viewport
       * sideways, invisible in a screenshot because `main`'s `overflow-y-
       * auto` also makes its `overflow-x` computed value `auto` per the CSS
       * overflow spec, so the clipped width just scrolls inside `main`
       * instead of widening the document.
       */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav
          aria-label="Bake types"
          // The real cookbook this ships for already has 18 distinct folders;
          // an uncapped vertical list at that count would push the content
          // column down the page behind it. Past `lg` the rail scrolls
          // internally instead of growing without bound.
          className="no-scrollbar flex w-full shrink-0 gap-1 overflow-x-auto lg:w-40 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => setBank(ALL_BANK)}
            className={`label-silkscreen shrink-0 whitespace-nowrap rounded-control px-3 py-2 text-left ${
              bank === ALL_BANK ? 'bg-panel-sunk text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            All ({allRecipes.length})
          </button>
          {banks.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setBank(name)}
              className={`label-silkscreen shrink-0 whitespace-nowrap rounded-control px-3 py-2 text-left ${
                bank === name ? 'bg-panel-sunk text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {name} ({count})
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-8">
          {activeRecipe && (
            <section className="border border-signal rounded-panel p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 bg-signal" aria-hidden="true" />
                <span className="label-silkscreen text-signal">Now baking</span>
              </div>
              <PatternRow recipe={activeRecipe} isActive activeStep={activeBake!.stepIndex} />
            </section>
          )}

          {showShelves && (
            <>
              <Shelf title="Personal Bests" items={personalBests} caption="Personal best" />
              <Shelf title="Recently Baked" items={recentlyBaked} caption="" />
            </>
          )}

          <section>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2 border-b border-rule py-4">
                    <div className="h-6 w-2/3 bg-panel-sunk" />
                    <div className="h-2 w-full bg-panel-sunk" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="border border-signal rounded-panel px-6 py-16 text-center">
                <p className="font-faceplate text-lg text-ink">Couldn't load your cookbook</p>
                <p className="mt-2 text-sm text-ink-muted">{loadError}</p>
                <Button variant="secondary" className="mt-6" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : recipes.length === 0 ? (
              <div className="rounded-panel border border-dashed border-rule px-6 py-16 text-center text-ink-muted">
                <p>No recipes found.</p>
              </div>
            ) : (
              <div>
                {recipes
                  .filter((r: Recipe) => !activeRecipe || r._id !== activeRecipe._id)
                  .map((recipe: Recipe) => (
                    <PatternRow key={recipe._id} recipe={recipe} isActive={false} />
                  ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
