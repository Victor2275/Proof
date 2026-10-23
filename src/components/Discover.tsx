import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePublishedIndex } from '../lib/queries';
import type { PublishedRecipe } from '../lib/types';
import { headnote } from '../lib/recipeText';
import { AccountSheetButton } from './AccountMenu';
import { Button, Field, PageHeader, RecipePlate, RecipeTile, Select, Sheet, Skeleton } from './ui';

/*
 * Discover: the shared cookbook (decisions B21, B22; changes 125, 126).
 *
 * A destination of its own, apart from the cookbook, so "is this mine?" always
 * has an answer: everything here is someone else's until it is saved. The
 * whole index comes down once and is searched, filtered and sorted on the
 * device (LAUNCH_PLAN.md, Phase 3 item 5).
 *
 * Laid out as a magazine rather than a catalogue: one search and one Sort,
 * then the first recipe across the page with its headnote, then two to a row.
 * Tags were a clipped row of chips; they are a filter sheet now, and the one
 * in force shows as a chip that takes itself off.
 */

type Sort = 'recent' | 'baked' | 'rating' | 'title';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Newest' },
  { key: 'baked', label: 'Most baked' },
  { key: 'rating', label: 'Top rated' },
  { key: 'title', label: 'A to Z' },
];

const average = (r: PublishedRecipe) => (r.stats?.ratingCount ? r.stats.ratingSum / r.stats.ratingCount : 0);

const compare: Record<Sort, (a: PublishedRecipe, b: PublishedRecipe) => number> = {
  recent: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  baked: (a, b) => (b.stats?.bakedCount ?? 0) - (a.stats?.bakedCount ?? 0) || b.publishedAt.localeCompare(a.publishedAt),
  // A rating with no votes is not a rating; unrated recipes follow the rated ones.
  rating: (a, b) => average(b) - average(a) || (b.stats?.ratingCount ?? 0) - (a.stats?.ratingCount ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
};

/** "@ada · baked 9 times": who, and how often it has been made, when it has. */
const byline = (r: PublishedRecipe) =>
  [`@${r.authorHandle}`, r.stats?.bakedCount ? `baked ${r.stats.bakedCount === 1 ? 'once' : `${r.stats.bakedCount} times`}` : null]
    .filter(Boolean)
    .join(' · ');

const EMPTY: PublishedRecipe[] = [];
const PAGE = 48;

export default function Discover() {
  const index = usePublishedIndex();
  const all = index.data ?? EMPTY;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [tag, setTag] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [shown, setShown] = useState(PAGE);

  // The tags people actually use, most common first.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of all) for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [all]);

  const results = useMemo(() => {
    const tagged = tag ? all.filter((r) => r.tags?.includes(tag)) : all;
    if (search.trim()) {
      const fuse = new Fuse(tagged, { keys: ['title', 'description', 'tags', 'authorHandle'], threshold: 0.3, ignoreLocation: true });
      return fuse.search(search).map((r) => r.item);
    }
    return [...tagged].sort(compare[sort]);
  }, [all, tag, search, sort]);

  // A search is a list of answers, not a magazine: no feature while one is typed.
  const featured = !search.trim() && results.length > 2 ? results[0] : null;
  const grid = (featured ? results.slice(1) : results).slice(0, shown);
  const rest = results.length - (featured ? 1 : 0) - grid.length;

  const chooseTag = (next: string) => {
    setTag(next);
    setShown(PAGE);
    setFiltering(false);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-20">
      <PageHeader
        title="Discover"
        subtitle="Recipes other bakers have published. Save one and it becomes yours to bake, log and change."
        actions={<AccountSheetButton className="md:hidden" />}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Search the shared cookbook"
            hideLabel
            type="search"
            placeholder="Search recipes, tags or bakers"
            leading={<Search className="h-4 w-4 text-ink-muted" aria-hidden="true" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE);
            }}
            className="min-w-0 flex-1 basis-60"
          />
          <Select
            label="Sort"
            hideLabel
            value={sort}
            disabled={!!search.trim()}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="w-40"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
          {tags.length > 0 ? (
            <Button variant="ghost" onClick={() => setFiltering(true)} icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}>
              Tags
            </Button>
          ) : null}
        </div>
        {tag ? (
          <div>
            <button
              type="button"
              onClick={() => chooseTag('')}
              aria-label={`Showing ${tag}; show every tag`}
              className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper-tonal pl-3.5 pr-2.5 text-sm text-ink"
            >
              {tag}
              <X className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {index.isPending ? (
        <div className="flex flex-col gap-6" role="status" aria-label="Opening the shared cookbook">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : index.isError ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-ink">The shared cookbook needs a connection, and this device can't reach it right now.</p>
          <p className="text-sm text-ink-muted">Your own cookbook works offline. Try again when you're back online.</p>
          <Button onClick={() => index.refetch()}>Try again</Button>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8 text-ink-2">
          {all.length === 0 ? (
            <p>Nothing has been published yet.</p>
          ) : (
            <>
              <p>
                Nothing in the shared cookbook matches{search.trim() ? ` “${search.trim()}”` : ''}
                {tag ? ` under ${tag}` : ''}.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setTag('');
                }}
              >
                Clear the search
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {featured ? <Feature recipe={featured} /> : null}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-3">
            {grid.map((r) => (
              <li key={r._id}>
                <RecipeTile recipe={r} to={`/r/${r.slug}`} caption={byline(r)} />
              </li>
            ))}
          </ul>
          {rest > 0 ? (
            <Button className="self-center" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, rest)} more
            </Button>
          ) : null}
        </>
      )}

      <Sheet open={filtering} onClose={() => setFiltering(false)} title="Tags" placement="bottom" size="md">
        <ul className="flex flex-col">
          {[{ name: '', count: all.length }, ...tags].map((t) => (
            <li key={t.name || 'all'} className="border-b border-rule">
              <button
                type="button"
                aria-pressed={tag === t.name}
                onClick={() => chooseTag(t.name)}
                className="pressable flex min-h-12 w-full items-center justify-between gap-3 rounded-key px-1.5 text-left hover:bg-paper-sunk aria-pressed:font-semibold"
              >
                <span className="text-ink">{t.name || 'Every recipe'}</span>
                <span className="text-sm tabular-nums text-ink-muted">{t.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** The first recipe across the page, with its headnote: the magazine's lead. */
function Feature({ recipe }: { recipe: PublishedRecipe }) {
  const note = headnote(recipe.description);
  return (
    <Link to={`/r/${recipe.slug}`} className="pressable group grid grid-cols-1 gap-4 rounded-key md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-end md:gap-8">
      <RecipePlate src={recipe.imageUrls?.[0]} alt={recipe.title} size="hero" eager />
      <div className="flex flex-col gap-2 md:pb-2">
        <h3 className="font-title text-3xl leading-tight text-ink group-hover:underline group-hover:decoration-rule-strong group-hover:underline-offset-4 md:text-4xl">
          {recipe.title}
        </h3>
        {note ? <p className="font-prose line-clamp-4 text-lg italic text-ink-2">{note}</p> : null}
        <p className="text-sm text-ink-muted">{byline(recipe)}</p>
      </div>
    </Link>
  );
}
