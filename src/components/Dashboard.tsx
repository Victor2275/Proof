import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, LayoutGrid, List as ListIcon, Search, Shuffle, SlidersHorizontal, X } from 'lucide-react';
import type { BakeLog, PantryItem, Recipe } from '../lib/types';
import { useBakeLogs, useNotes, usePantry, usePublications, useRecipes } from '../lib/queries';
import { useActiveBake } from '../lib/useActiveBake';
import { useSession } from '../lib/session';
import { haptic } from '../lib/haptics';
import {
  NO_FILTER,
  SORTS,
  activeFilters,
  chapters as readChapters,
  filterRecipes,
  indexByLetter,
  readBakes,
  readingOf,
  bakedPhrase,
  searchBakeNotes,
  searchRecipes,
  sortRecipes,
  tileCaption,
  whenBaked,
  type CookbookFilter,
  type SortKey,
} from '../lib/cookbook';
import { firstLine } from '../lib/recipeText';
import { NewRecipeButton } from './NewRecipeSheet';
import { AccountSheetButton } from './AccountMenu';
import StarterShelf from './StarterShelf';
import { NewRecipeDoors } from './NewRecipeSheet';
import { STORED_ON_DEVICE } from '../lib/storage';
import CookbookFilterSheet from './CookbookFilterSheet';
import {
  BackButton,
  Button,
  Disclosure,
  Field,
  LetterRail,
  MarginNote,
  PageHeader,
  RecipePlate,
  RecipeTile,
  Ribbon,
  Segmented,
  Select,
  Stars,
  cn,
} from './ui';

/*
 * The cookbook (UI overhaul Phase 4, changes 43–57).
 *
 * Search first, full width. Then one card to pick up where you left off — the
 * bake running now, or the last one baked with its note to next time — then
 * one strip of what has been baked lately, then the book's contents: chapters
 * with dotted leaders, or a back-of-book index from A to Z, and every recipe
 * under them. A recipe appears once above the grid, never three times.
 *
 * A chapter opens as its own page (`?chapter=`), which is where a recipe's
 * back button returns. A search reads the titles, the tags, the ingredients
 * and the baker's own bake notes, and says which is which.
 */

const EMPTY_RECIPES: Recipe[] = [];
const EMPTY_LOGS: BakeLog[] = [];
const EMPTY_PANTRY: PantryItem[] = [];
/** Chapters shown before "Show more": the rest are small. */
const CHAPTERS_SHOWN = 8;
/** Tiles drawn before the next page is fetched as the end comes into view. */
const PAGE_SIZE = 36;
const VIEW_KEY = 'proof.cookbookLayout';
const SORT_KEY = 'proof.cookbookSort';

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A preference that cannot be kept is still the choice for this visit.
  }
}

export default function Dashboard() {
  const { data: allRecipes = EMPTY_RECIPES, isPending, error, refetch } = useRecipes();
  const { data: bakeLogs = EMPTY_LOGS } = useBakeLogs();
  const { data: pantry = EMPTY_PANTRY } = usePantry();
  const { data: notes } = useNotes();
  const { byLocalId: published } = usePublications();
  const { session } = useSession();
  const activeBake = useActiveBake();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const chapter = params.get('chapter');
  const contentsView = params.get('view') === 'az' ? 'az' : 'chapters';
  // A search can arrive in the address (`/?q=rye`), from the 404 page's search field.
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [layout, setLayout] = useState<'grid' | 'list'>(() => readPref(VIEW_KEY, ['grid', 'list'] as const, 'grid'));
  const [sort, setSort] = useState<SortKey>(() => readPref(SORT_KEY, ['recent', 'az', 'baked', 'rating'] as const, 'recent'));
  const [filter, setFilter] = useState<CookbookFilter>(NO_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);

  const loadError = error instanceof Error ? error.message : null;
  const settled = !isPending && !loadError;
  const emptyCookbook = settled && allRecipes.length === 0;

  const readings = useMemo(() => readBakes(bakeLogs), [bakeLogs]);
  const byId = useMemo(() => new Map(allRecipes.map((r) => [r._id, r])), [allRecipes]);
  const publishedIds = useMemo(
    () => new Set([...published.entries()].filter(([, p]) => p.moderation.state === 'approved').map(([id]) => id)),
    [published],
  );

  /* ── Pick up where you left off, and Recently baked (changes 44–46) ─── */
  const resume = useMemo(() => {
    if (activeBake && byId.has(activeBake.recipeId)) return { recipe: byId.get(activeBake.recipeId)!, running: true as const };
    const last = bakeLogs[0];
    if (last && byId.has(last.recipeId)) return { recipe: byId.get(last.recipeId)!, running: false as const, log: last };
    return null;
  }, [activeBake, bakeLogs, byId]);

  const recentlyBaked = useMemo(() => {
    const seen = new Set<string>(resume ? [resume.recipe._id] : []);
    const out: Recipe[] = [];
    for (const log of bakeLogs) {
      const recipe = byId.get(log.recipeId);
      if (recipe && !seen.has(recipe._id)) {
        seen.add(recipe._id);
        out.push(recipe);
      }
      if (out.length === 8) break;
    }
    return out;
  }, [bakeLogs, byId, resume]);

  /* ── The list ─────────────────────────────────────────────────────── */
  const scoped = useMemo(() => (chapter ? allRecipes.filter((r) => (r.folder || 'Uncategorized') === chapter) : allRecipes), [allRecipes, chapter]);
  const listed = useMemo(
    () => sortRecipes(filterRecipes(scoped, filter, { readings, publishedIds, pantry }), sort, readings),
    [scoped, filter, readings, publishedIds, pantry, sort],
  );

  const searching = query.trim().length > 0;
  const recipeHits = useMemo(() => (searching ? searchRecipes(scoped, query) : []), [searching, scoped, query]);
  const noteHits = useMemo(() => (searching ? searchBakeNotes(bakeLogs, byId, query) : []), [searching, bakeLogs, byId, query]);

  const surprise = (from: Recipe[]) => {
    if (!from.length) return;
    haptic('light');
    navigate(`/recipe/${from[Math.floor(Math.random() * from.length)]._id}`);
  };

  const filtersOn = activeFilters(filter);
  const tileFor = (r: Recipe) => {
    const reading = readingOf(readings, r._id);
    return (
      <RecipeTile
        key={r._id}
        recipe={r}
        caption={tileCaption(r, reading)}
        best={reading.hasBest}
        tag={publishedIds.has(r._id) ? 'Public' : undefined}
      />
    );
  };

  const header = chapter ? (
    <PageHeader
      back={<BackButton to="/" label="Cookbook" />}
      title={chapter}
      subtitle={`${scoped.length} ${scoped.length === 1 ? 'recipe' : 'recipes'}`}
      actions={<AccountSheetButton className="md:hidden" />}
    />
  ) : (
    <PageHeader
      title="Cookbook"
      subtitle={settled && !emptyCookbook ? `${allRecipes.length} ${allRecipes.length === 1 ? 'recipe' : 'recipes'}` : undefined}
      actions={
        <>
          <NewRecipeButton className="md:hidden" />
          <AccountSheetButton className="md:hidden" />
        </>
      }
    />
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-8">
      <div className="flex flex-col gap-4">
        {header}
        {emptyCookbook ? null : (
          <Field
            label="Search the cookbook"
            hideLabel
            type="search"
            leading={<Search className="h-[18px] w-[18px]" aria-hidden="true" />}
            placeholder={
              chapter
                ? `Search ${chapter}, ingredients, notes`
                : settled
                  ? `Search ${allRecipes.length} recipes, ingredients, notes`
                  : 'Search recipes, ingredients, notes'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </div>

      {loadError ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="font-title text-xl text-ink">Couldn't open the cookbook on this device</p>
          <p className="max-w-prose text-ink-2">
            {loadError} Try again; if it keeps happening, the browser may be blocking storage for this site, which private browsing does.
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : emptyCookbook ? (
        /*
         * The empty cookbook is the welcome (changes 39–42): no tour, just the
         * three ways in and a shelf of recipes to start from, with where it is
         * all kept said once, near the top, in plain words.
         */
        <div className="flex flex-col gap-10">
          <section aria-labelledby="start-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="start-heading" className="font-title text-2xl text-ink">
                Your cookbook is empty
              </h2>
              <p className="text-ink-2">{STORED_ON_DEVICE}</p>
            </div>
            <NewRecipeDoors />
          </section>
          <StarterShelf />
        </div>
      ) : !settled ? null : searching ? (
        /* ── Search results, grouped (change 54) ───────────────────────── */
        <section aria-label="Search results" className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2.5">
            <p className="text-sm text-ink-2" aria-live="polite">
              {recipeHits.length} {recipeHits.length === 1 ? 'recipe' : 'recipes'}
              {noteHits.length ? ` · ${noteHits.length} in your bake notes` : ''}
            </p>
            {recipeHits.length > 1 ? (
              <Button size="sm" variant="ghost" icon={<Shuffle className="h-4 w-4" aria-hidden="true" />} onClick={() => surprise(recipeHits)}>
                Surprise me from these
              </Button>
            ) : null}
          </div>
          {recipeHits.length === 0 && noteHits.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-ink-2">
                Nothing in {chapter ?? 'the cookbook'} matches “{query.trim()}”, in a title, an ingredient or a bake note.
              </p>
              <Button variant="ghost" onClick={() => setQuery('')}>
                Clear the search
              </Button>
            </div>
          ) : null}
          {recipeHits.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">{recipeHits.map(tileFor)}</div>
          ) : null}
          {noteHits.length ? (
            <section aria-labelledby="note-hits" className="flex flex-col">
              <h2 id="note-hits" className="font-title border-b border-rule pb-2.5 text-xl text-ink">
                In your bake notes
              </h2>
              <ul>
                {noteHits.map(({ log, recipe, snippet }) => (
                  <li key={log._id} className="border-b border-rule">
                    <Link
                      to={`/recipe/${recipe._id}?makeId=${log._id}`}
                      className="pressable -mx-2 flex flex-col gap-0.5 rounded-key px-2 py-3 hover:bg-paper-sunk"
                    >
                      <span className="font-title text-lg text-ink">{recipe.title}</span>
                      <span className="text-sm text-ink-muted">{whenBaked(log.date)}</span>
                      <span className="font-prose italic text-ink-2">{snippet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      ) : (
        <>
          {!chapter && resume ? <ResumeCard {...resume} rating={resume.running ? null : readingOf(readings, resume.recipe._id).rating} bakes={readingOf(readings, resume.recipe._id).bakes} /> : null}

          {!chapter && recentlyBaked.length ? (
            <section aria-labelledby="recently-baked" className="flex flex-col gap-2">
              <Link
                to="/bakes"
                className="pressable -mx-1.5 flex min-h-12 items-center justify-between rounded-key px-1.5 hover:bg-paper-sunk"
              >
                <h2 id="recently-baked" className="font-title text-xl italic text-ink-2">
                  Recently baked
                </h2>
                <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              </Link>
              <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {recentlyBaked.map((r) => {
                  const reading = readingOf(readings, r._id);
                  return (
                    <li key={r._id} className="w-36 shrink-0">
                      <RecipeTile recipe={r} caption={tileCaption(r, reading)} best={reading.hasBest} />
                    </li>
                  );
                })}
                <li className="w-28 shrink-0">
                  <Link
                    to="/bakes"
                    className="pressable flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-key border border-dashed border-rule-strong text-sm font-semibold text-ink hover:bg-paper-sunk"
                  >
                    All bakes
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </section>
          ) : null}

          {!chapter ? (
            <Contents
              view={contentsView}
              onView={(v) => setParams(v === 'az' ? { view: 'az' } : {}, { replace: true })}
              recipes={allRecipes}
              notesCount={notes?.length ?? 0}
            />
          ) : null}

          <section aria-labelledby="all-recipes" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2.5">
              <h2 id="all-recipes" className="font-title text-2xl text-ink">
                {chapter ? 'Recipes' : 'All recipes'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  label="Sort"
                  hideLabel
                  value={sort}
                  onChange={(e) => {
                    const next = e.target.value as SortKey;
                    setSort(next);
                    writePref(SORT_KEY, next);
                  }}
                  className="w-44"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setFilterOpen(true)}
                  aria-haspopup="dialog"
                >
                  {filtersOn ? `Filter · ${filtersOn}` : 'Filter'}
                </Button>
                <Segmented
                  label="Layout"
                  value={layout}
                  onChange={(next) => {
                    setLayout(next);
                    writePref(VIEW_KEY, next);
                  }}
                  options={[
                    { value: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
                    { value: 'list', label: 'List', icon: <ListIcon className="h-4 w-4" aria-hidden="true" /> },
                  ]}
                />
              </div>
            </div>

            {filtersOn ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                {listed.length} of {scoped.length} shown
                <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={() => setFilter(NO_FILTER)}>
                  Clear filters
                </Button>
              </div>
            ) : null}

            {listed.length === 0 ? (
              <p className="text-ink-2">No recipe here fits those filters.</p>
            ) : (
              <Paged key={`${chapter}-${sort}-${JSON.stringify(filter)}-${layout}`} items={listed} layout={layout} tile={tileFor} readings={readings} />
            )}
            {listed.length > 1 ? (
              <Button variant="ghost" className="self-center" icon={<Shuffle className="h-4 w-4" aria-hidden="true" />} onClick={() => surprise(listed)}>
                Surprise me
              </Button>
            ) : null}
          </section>
        </>
      )}

      <CookbookFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filter}
        onChange={setFilter}
        chapters={chapter ? [] : readChapters(allRecipes).map((c) => c.name)}
        hasPantry={pantry.length > 0}
        signedIn={!!session.user}
      />
    </div>
  );
}

/* ── Pick up where you left off ──────────────────────────────────────── */

function ResumeCard({
  recipe,
  running,
  log,
  rating,
  bakes,
}: {
  recipe: Recipe;
  running: boolean;
  log?: BakeLog;
  rating: number | null;
  bakes: number;
}) {
  const to = running ? `/recipe/${recipe._id}/bake` : `/recipe/${recipe._id}`;
  const lead = running ? 'Resume baking' : 'Pick up where you left off';
  const label = [
    `${lead}: ${recipe.title}`,
    !running && log ? bakedPhrase(log.date) : '',
    rating ? `${Math.round(rating)} of 5 stars` : '',
    log?.nextTime ? `Next time: ${log.nextTime}` : '',
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <Link to={to} aria-label={label} className="pressable relative flex gap-3.5 rounded-panel bg-paper-sunk p-3.5 hover:bg-paper-tonal">
      <Ribbon />
      <RecipePlate src={recipe.imageUrls?.[0]} alt="" size="row" className="h-24 w-24 sm:h-24 sm:w-24" />
      <span className="flex min-w-0 flex-col gap-1 pr-7">
        <span className="text-xs font-semibold text-pencil">{lead}</span>
        <span className="font-title text-xl leading-tight text-ink">{recipe.title}</span>
        {!running && log ? (
          <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-ink-muted">
            {whenBaked(log.date)}
            {log.rating ? <Stars value={log.rating} /> : null}
            {bakes > 1 ? `· ${bakes} bakes` : ''}
          </span>
        ) : null}
        {!running && log?.nextTime ? <MarginNote className="line-clamp-2">{log.nextTime}</MarginNote> : null}
        {!running && log && !log.nextTime && firstLine(log.notes) ? (
          <span className="font-prose line-clamp-2 italic text-ink-2">“{firstLine(log.notes)}”</span>
        ) : null}
      </span>
    </Link>
  );
}

/* ── Contents: chapters, or the index A–Z (changes 47, 48) ───────────── */

function Contents({
  view,
  onView,
  recipes,
  notesCount,
}: {
  view: 'chapters' | 'az';
  onView: (v: 'chapters' | 'az') => void;
  recipes: Recipe[];
  notesCount: number;
}) {
  const list = useMemo(() => readChapters(recipes), [recipes]);
  const index = useMemo(() => (view === 'az' ? indexByLetter(recipes) : []), [recipes, view]);
  const first = list.slice(0, CHAPTERS_SHOWN);
  const rest = list.slice(CHAPTERS_SHOWN);
  const indexRef = useRef<HTMLDivElement>(null);

  const row = (to: string, name: string, count: number | null, unit = 'recipes') => (
    <li key={name}>
      <Link
        to={to}
        aria-label={count === null ? name : `${name}, ${count} ${count === 1 ? unit.replace(/s$/, '') : unit}`}
        className="pressable -mx-1.5 flex min-h-[3.25rem] items-center gap-2 rounded-key px-1.5 transition-[padding] hover:bg-paper-sunk active:pl-2.5"
      >
        <span className="font-prose text-lg text-ink">{name}</span>
        <span aria-hidden="true" className="flex-1 translate-y-1.5 border-b-[1.5px] border-dotted border-rule-strong" />
        {count !== null ? <span className="text-[0.9375rem] tabular-nums text-ink-muted">{count}</span> : null}
      </Link>
    </li>
  );

  return (
    <section aria-labelledby="contents-heading" className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2.5">
        <h2 id="contents-heading" className="font-title text-2xl text-ink">
          Contents
        </h2>
        <Segmented
          label="Contents view"
          value={view}
          onChange={onView}
          options={[
            { value: 'chapters', label: 'Chapters' },
            { value: 'az', label: 'A–Z' },
          ]}
        />
      </div>

      {view === 'chapters' ? (
        <>
          <ul>{first.map((c) => row(`/?chapter=${encodeURIComponent(c.name)}`, c.name, c.count))}</ul>
          {rest.length || notesCount ? (
            <Disclosure
              summary={rest.length ? `${rest.length} more ${rest.length === 1 ? 'chapter' : 'chapters'} and loose notes` : 'Loose notes'}
              openSummary="Show fewer"
              className="mt-1"
            >
              <ul>
                {rest.map((c) => row(`/?chapter=${encodeURIComponent(c.name)}`, c.name, c.count))}
                {row('/notes', 'Loose notes', notesCount, 'notes')}
              </ul>
            </Disclosure>
          ) : null}
        </>
      ) : (
        <div ref={indexRef} className="relative flex gap-2">
          <div className="min-w-0 flex-1">
            {index.map(({ letter, recipes: group }) => (
              <section key={letter} aria-labelledby={`index-${letter}`} className="scroll-mt-20">
                <h3 id={`index-${letter}`} className="font-title mt-4 flex items-baseline gap-2 text-2xl text-ink">
                  {letter}
                  <span className="font-sans text-sm font-normal text-ink-muted">
                    {group.length} {group.length === 1 ? 'recipe' : 'recipes'}
                  </span>
                </h3>
                <ul>
                  {group.map((r) => (
                    <li key={r._id}>
                      <Link
                        to={`/recipe/${r._id}`}
                        className="pressable -mx-1.5 flex min-h-11 items-center border-b border-rule px-1.5 font-prose text-[1.0625rem] text-ink hover:bg-paper-sunk"
                      >
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <LetterRail
            letters={index.map((g) => g.letter)}
            idFor={(l) => `index-${l}`}
            onJump={(l) => document.getElementById(`index-${l}`)?.scrollIntoView({ block: 'start' })}
            className="sticky top-4 h-[min(36rem,calc(100dvh-10rem))] self-start"
          />
        </div>
      )}
    </section>
  );
}

/* ── The grid or the list, a page at a time (changes 49, 56) ─────────── */

function Paged({
  items,
  layout,
  tile,
  readings,
}: {
  items: Recipe[];
  layout: 'grid' | 'list';
  tile: (r: Recipe) => React.ReactNode;
  readings: ReturnType<typeof readBakes>;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const end = useRef<HTMLDivElement>(null);
  const more = items.length - shown;

  // The next page arrives as the end of this one comes into view: no button
  // to press, and never two hundred photographs requested at once.
  useEffect(() => {
    const el = end.current;
    if (!el || more <= 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShown((n) => n + PAGE_SIZE);
    }, { rootMargin: '600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [more]);

  const page = items.slice(0, shown);
  return (
    <>
      {layout === 'grid' ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">{page.map(tile)}</div>
      ) : (
        <ul className="flex flex-col">
          {page.map((r) => {
            const reading = readingOf(readings, r._id);
            return (
              <li key={r._id} className="border-b border-rule">
                <Link to={`/recipe/${r._id}`} className="pressable -mx-1.5 flex items-center gap-3 rounded-key px-1.5 py-2 hover:bg-paper-sunk">
                  <RecipePlate src={r.imageUrls?.[0]} alt={r.title} size="row" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-title text-lg leading-snug text-ink">{r.title}</span>
                    <span className="text-[0.8125rem] text-ink-muted">{tileCaption(r, reading)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div ref={end} aria-hidden="true" />
      {more > 0 ? (
        <Button variant="ghost" className={cn('self-center')} onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Show {Math.min(more, PAGE_SIZE)} more of {items.length}
        </Button>
      ) : null}
    </>
  );
}
