import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { usePublishedIndex } from '../lib/queries';
import type { PublishedRecipe } from '../lib/types';
import { Button, Field, Panel, RecipeTile, Skeleton, cn } from './ui';

/*
 * Discover: the shared cookbook (decisions B21, B22).
 *
 * A destination of its own, apart from the cookbook, so "is this mine?" always
 * has an answer: everything here is someone else's until it is saved. The
 * whole index comes down once and is searched, filtered and sorted on the
 * device (LAUNCH_PLAN.md, Phase 3 item 5). It is a network read, so it gets a
 * skeleton while it arrives (B30), and says so when there is no connection.
 */

type Sort = 'recent' | 'baked' | 'rating' | 'title';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'baked', label: 'Most baked' },
  { key: 'rating', label: 'Top rated' },
  { key: 'title', label: 'A–Z' },
];

const average = (r: PublishedRecipe) => (r.stats?.ratingCount ? r.stats.ratingSum / r.stats.ratingCount : 0);

const compare: Record<Sort, (a: PublishedRecipe, b: PublishedRecipe) => number> = {
  recent: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  baked: (a, b) => (b.stats?.bakedCount ?? 0) - (a.stats?.bakedCount ?? 0) || b.publishedAt.localeCompare(a.publishedAt),
  // A rating with no votes is not a rating; unrated recipes follow the rated ones.
  rating: (a, b) => average(b) - average(a) || (b.stats?.ratingCount ?? 0) - (a.stats?.ratingCount ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
};

const EMPTY: PublishedRecipe[] = [];
const PAGE = 48;

export default function Discover() {
  const index = usePublishedIndex();
  const all = index.data ?? EMPTY;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [tag, setTag] = useState('');
  const [shown, setShown] = useState(PAGE);

  // The tags people actually use, most common first: a bank, not a cloud.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of all) for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([t]) => t);
  }, [all]);

  const results = useMemo(() => {
    const tagged = tag ? all.filter((r) => r.tags?.includes(tag)) : all;
    if (search.trim()) {
      const fuse = new Fuse(tagged, { keys: ['title', 'description', 'tags', 'authorHandle'], threshold: 0.3, ignoreLocation: true });
      return fuse.search(search).map((r) => r.item);
    }
    return [...tagged].sort(compare[sort]);
  }, [all, tag, search, sort]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-20">
      <header className="flex flex-col gap-4 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-faceplate text-3xl text-ink md:text-4xl">Discover</h1>
          <p className="max-w-prose text-ink-muted">
            Recipes other bakers have published. Save one and it becomes yours to bake, log and change.
          </p>
        </div>
        <Field
          label="Search"
          hideLabel
          placeholder="Search recipes, tags or bakers…"
          leading={<Search className="h-4 w-4 text-ink-muted" aria-hidden="true" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShown(PAGE);
          }}
          className="max-w-xl"
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex gap-px" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <Button key={s.key} size="sm" engaged={sort === s.key} disabled={!!search.trim()} onClick={() => setSort(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
          {tags.length > 0 ? (
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="group" aria-label="Tags">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => {
                    setTag(tag === t ? '' : t);
                    setShown(PAGE);
                  }}
                  className={cn(
                    'label-silkscreen flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-control px-3 lg:min-h-0 lg:py-2',
                    tag === t ? 'bg-panel-sunk text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {index.isPending ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Opening the shared cookbook">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : index.isError ? (
        <Panel title="Shared cookbook">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">The shared cookbook needs a connection, and this device can't reach it right now.</p>
            <p className="text-sm text-ink-muted">Your own cookbook works offline. Try again when you're back online.</p>
            <Button className="self-start" onClick={() => index.refetch()}>
              Try again
            </Button>
          </div>
        </Panel>
      ) : results.length === 0 ? (
        <div className="rounded-panel border border-dashed border-rule px-6 py-16 text-center text-ink-muted">
          {all.length === 0 ? (
            <p>Nothing has been published yet.</p>
          ) : (
            <>
              <p>Nothing in the shared cookbook matches{search.trim() ? ` “${search.trim()}”` : ''}{tag ? ` under ${tag}` : ''}.</p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setTag('');
                }}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="label-silkscreen text-ink-muted">
            {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {results.slice(0, shown).map((r) => (
              <li key={r._id} className="flex flex-col gap-1">
                <RecipeTile recipe={r} to={`/r/${r.slug}`} />
                <span className="label-silkscreen text-ink-muted">
                  @{r.authorHandle}
                  {r.stats?.bakedCount ? ` · baked ${r.stats.bakedCount}×` : ''}
                </span>
              </li>
            ))}
          </ul>
          {results.length > shown ? (
            <Button className="self-center" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, results.length - shown)} more
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
