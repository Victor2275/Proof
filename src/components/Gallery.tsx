import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, type BakeLog } from '../lib/api';
import { Button, Panel, RecipePlate, cn } from './ui';

/*
 * The bake history, read as iterations.
 *
 * A gallery of every photograph in date order is a screensaver: it says a lot
 * of baking happened and nothing about whether any of it got better. What a
 * baker actually wants from this screen is the comparison — this loaf against
 * the same loaf three attempts ago — so the default reading groups a recipe's
 * bakes into one row running oldest to newest, and the row itself is the
 * progress. Sorting by date stays as the second reading, because sometimes the
 * question really is "what did I make last weekend".
 *
 * One tile is one bake, not one photograph. A bake with three photos is still
 * one attempt, and counting photos would inflate every row into a progression
 * that never happened; the extra shots are marked on the tile and live on the
 * bake's own page.
 */

type View = 'recipe' | 'date';

interface Entry {
  logId: string;
  recipeId: string;
  recipeTitle: string;
  date: string;
  notes: string;
  image: string;
  extraPhotos: number;
}

function toEntry(log: BakeLog): Entry | null {
  const image = log.imageUrls?.[0];
  if (!image || !log._id) return null;
  return {
    logId: log._id,
    recipeId: typeof log.recipeId === 'object' ? log.recipeId._id : log.recipeId,
    recipeTitle: typeof log.recipeId === 'object' ? log.recipeId.title : 'Unknown recipe',
    date: log.date,
    notes: log.notes || '',
    image,
    extraPhotos: Math.max(0, (log.imageUrls?.length ?? 1) - 1),
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Undated';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * A single bake. The photograph carries it; the date and notes arrive on hover
 * over the photograph's lower half, the same way a recipe tile behaves — and
 * for the same reason, nothing resizes.
 *
 * `index` is the attempt number, and it is only passed where there is a
 * sequence to count: a recipe baked once has no first attempt, only a bake, and
 * printing "01" beside it invents a progression that has not happened yet.
 */
function BakeTile({
  entry,
  index,
  showTitle = false,
}: {
  entry: Entry;
  index?: number;
  showTitle?: boolean;
}) {
  return (
    <Link
      to={`/recipe/${entry.recipeId}?makeId=${entry.logId}`}
      className="group flex flex-col gap-2 focus:outline-none"
    >
      <div className="relative overflow-hidden rounded-key border border-rule transition-colors group-hover:border-ink group-focus-visible:border-ink">
        <RecipePlate src={entry.image} alt={`${entry.recipeTitle}, ${formatDate(entry.date)}`} size="hero" />

        {/*
          Not aria-hidden: hover is exactly what a keyboard or screen reader
          user does not have, and the date is the only thing that tells two
          attempts apart.
        */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 translate-y-full',
            'border-t border-rule bg-panel faceplate px-3 py-2.5',
            'transition-transform duration-150 ease-out',
            'group-hover:translate-y-0 group-focus-visible:translate-y-0',
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="label-silkscreen truncate text-silkscreen">{formatDate(entry.date)}</span>
            {entry.extraPhotos > 0 ? (
              <span className="font-mono text-xs tabular-nums text-ink-muted">+{entry.extraPhotos}</span>
            ) : null}
          </div>
          {entry.notes ? (
            <p className="mt-1 line-clamp-3 text-sm leading-snug text-ink">{entry.notes}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        {index !== undefined ? (
          <span className="font-mono text-xs tabular-nums text-ink-muted">
            {String(index + 1).padStart(2, '0')}
          </span>
        ) : showTitle ? (
          <span className="min-w-0 truncate text-sm text-ink">{entry.recipeTitle}</span>
        ) : null}
        <span className="label-silkscreen shrink-0 text-silkscreen">{formatDate(entry.date)}</span>
      </div>
    </Link>
  );
}

export default function Gallery() {
  const [logs, setLogs] = useState<BakeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('recipe');

  useEffect(() => {
    api.getBakeLogs()
      .then((data) => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // A bake with no photograph has nothing to show in a gallery; it still lives
  // on the recipe's own page, where its notes are the point.
  const entries = useMemo(
    () => logs.map(toEntry).filter((e): e is Entry => e !== null),
    [logs],
  );

  /** One row per recipe, its bakes oldest → newest; rows ordered by most recent. */
  const byRecipe = useMemo(() => {
    const groups = new Map<string, { title: string; entries: Entry[] }>();
    entries.forEach((entry) => {
      const group = groups.get(entry.recipeId);
      if (group) group.entries.push(entry);
      else groups.set(entry.recipeId, { title: entry.recipeTitle, entries: [entry] });
    });

    return Array.from(groups.entries())
      .map(([recipeId, group]) => ({
        recipeId,
        title: group.title,
        entries: [...group.entries].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      }))
      .sort((a, b) => {
        const last = (g: { entries: Entry[] }) =>
          new Date(g.entries[g.entries.length - 1].date).getTime();
        return last(b) - last(a);
      });
  }, [entries]);

  /** Newest first, cut into months. */
  const byMonth = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const months: { label: string; entries: Entry[] }[] = [];
    sorted.forEach((entry) => {
      const label = formatMonth(entry.date);
      const last = months[months.length - 1];
      if (last && last.label === label) last.entries.push(entry);
      else months.push({ label, entries: [entry] });
    });
    return months;
  }, [entries]);

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header className="flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-faceplate text-3xl leading-none text-ink sm:text-4xl">Bake history</h1>
          <p className="text-ink-muted">
            {view === 'recipe'
              ? 'Each row is one recipe, oldest bake on the left.'
              : 'Every bake, newest first.'}
          </p>
        </div>

        <div className="flex gap-1" role="group" aria-label="How to group the history">
          <Button engaged={view === 'recipe'} onClick={() => setView('recipe')}>
            By Recipe
          </Button>
          <Button engaged={view === 'date'} onClick={() => setView('date')}>
            By Date
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-key bg-key-unlit" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        /* An empty pattern is still a pattern: unlit plates, drawn as
         * deliberately as full ones, rather than an illustration of absence. */
        <Panel title="No bakes logged yet">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-key border border-rule bg-key-unlit" />
              ))}
            </div>
            <p className="max-w-prose text-ink-muted">
              Finish a recipe in Baking Mode and log it with a photograph. Bake the same thing again
              and this fills with the comparison — the only way to see a loaf getting better.
            </p>
            <Link to="/" className="self-start">
              <Button variant="primary">Open the cookbook</Button>
            </Link>
          </div>
        </Panel>
      ) : view === 'recipe' ? (
        <div className="flex flex-col gap-10">
          {byRecipe.map((group) => (
            <section key={group.recipeId} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
                <Link to={`/recipe/${group.recipeId}`} className="min-w-0">
                  <h2 className="font-faceplate truncate text-lg text-ink hover:text-signal sm:text-xl">
                    {group.title}
                  </h2>
                </Link>
                <span className="label-silkscreen shrink-0 text-silkscreen">
                  {group.entries.length} {group.entries.length === 1 ? 'bake' : 'bakes'}
                </span>
              </div>

              {/* The row scrolls rather than wraps: a wrapped row of attempts
                * stops reading as a sequence the moment it breaks a line. */}
              <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                {group.entries.map((entry, index) => (
                  <div key={entry.logId} className="w-40 shrink-0 snap-start sm:w-52">
                    <BakeTile
                      entry={entry}
                      index={group.entries.length > 1 ? index : undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byMonth.map((month) => (
            <section key={month.label} className="flex flex-col gap-4">
              <h2 className="label-silkscreen border-b border-rule pb-2">{month.label}</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 2xl:grid-cols-4">
                {month.entries.map((entry) => (
                  <BakeTile key={entry.logId} entry={entry} showTitle />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
