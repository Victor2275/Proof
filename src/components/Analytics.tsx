import { useMemo } from 'react';
import type { Recipe, BakeLog } from '../lib/types';
import { useBakeLogs, useRecipes } from '../lib/queries';
import { Button, Panel, PanelRow, Meter } from './ui';

/*
 * Analytics, as an instrument rather than as a dashboard.
 *
 * The live library holds three bake logs. A twelve-month bar chart drawn over
 * that is eleven empty bars standing beside one, which looks like a product
 * with a reporting feature and reads as nothing at all. Every panel here draws
 * only what the data can actually support, and says plainly when there is not
 * enough to read — an instrument with nothing on its input is supposed to show
 * that, not invent a needle.
 *
 * It reads the cookbook from the device, the same queries the cookbook and the
 * bake history use, so the three never disagree about how many bakes exist.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Below this, a run of months is a handful of dots, not a trend. */
const MONTHS_FOR_A_TREND = 3;

const EMPTY_RECIPES: Recipe[] = [];
const EMPTY_LOGS: BakeLog[] = [];

export default function Analytics() {
  const recipesQuery = useRecipes();
  const logsQuery = useBakeLogs();
  const recipes = recipesQuery.data ?? EMPTY_RECIPES;
  const logs = logsQuery.data ?? EMPTY_LOGS;

  const reading = useMemo(() => {
    const bakeCounts = new Map<string, number>();
    logs.forEach((log) => {
      const rid = log.recipeId;
      bakeCounts.set(rid, (bakeCounts.get(rid) ?? 0) + 1);
    });

    // Months that actually have a bake in them, newest first. Months with
    // nothing are not drawn: an empty row is not a reading of zero, it is the
    // absence of a reading, and twelve of them hide the two that are real.
    const monthCounts = new Map<string, number>();
    logs.forEach((log) => {
      const d = new Date(log.date);
      if (Number.isNaN(d.getTime())) return;
      monthCounts.set(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`, 0);
    });
    logs.forEach((log) => {
      const d = new Date(log.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    });

    const months = [...monthCounts.entries()]
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        return { key, label: `${MONTHS[Number(month)]} ${year}`, count };
      })
      .sort((a, b) => b.key.localeCompare(a.key));

    // Only recipes actually baked more than once can be ranked. With every
    // recipe at one bake there is no order to report, and printing the first
    // three of a 3-way tie would invent one.
    const repeated = [...bakeCounts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rid, count]) => ({ recipe: recipes.find((r) => r._id === rid), count }))
      .filter((x) => x.recipe);

    return {
      totalBakes: logs.length,
      personalBests: logs.filter((l) => l.isPersonalBest).length,
      recipesBaked: bakeCounts.size,
      months,
      peakMonth: months.reduce((max, m) => Math.max(max, m.count), 0),
      repeated,
    };
  }, [logs, recipes]);

  // A read from the device: nothing is drawn while it arrives (B30).
  if (recipesQuery.isPending || logsQuery.isPending) return null;

  // An error replaces the readings rather than sitting above a panel of zeros
  // that were never measured (audit #3).
  const failed = recipesQuery.error ?? logsQuery.error;
  if (failed) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-20">
        <h1 className="font-title border-b border-rule pb-6 text-3xl leading-none text-ink sm:text-4xl">Analytics</h1>
        <Panel title="Bake history">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">Couldn't read the bake history on this device, so there is nothing to report.</p>
            <p className="text-sm text-ink-muted">{failed instanceof Error ? failed.message : ''}</p>
            <Button
              className="self-start"
              onClick={() => {
                void recipesQuery.refetch();
                void logsQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const nothingLogged = reading.totalBakes === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-title text-3xl leading-none text-ink sm:text-4xl">Analytics</h1>
          <p className="max-w-prose text-ink-muted">
            What the bake logs can prove. Panels report only what the data supports, and say so
            when there is not enough of it.
          </p>
        </div>
        <span className="ui-label shrink-0">
          {reading.totalBakes} {reading.totalBakes === 1 ? 'bake' : 'bakes'} logged
        </span>
      </header>

      <Panel title="Totals">
        <div className="flex flex-col gap-4">
          <div>
            <PanelRow label="Bakes logged" value={reading.totalBakes} />
            <PanelRow label="Recipes baked" value={reading.recipesBaked} />
            <PanelRow label="Personal bests" value={reading.personalBests} />
            <PanelRow label="Recipes in the library" value={recipes.length} />
          </div>

          {recipes.length > 0 ? (
            <Meter
              label="Library baked at least once"
              value={reading.recipesBaked}
              max={recipes.length}

              readout={`${reading.recipesBaked} of ${recipes.length}`}
            />
          ) : null}
        </div>
      </Panel>

      <Panel title="Bakes by month">
        {nothingLogged ? (
          <p className="text-sm text-ink-muted">
            No bakes logged yet. Finish a bake and log it, and this begins reading.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5">
              {reading.months.map((month) => (
                <Meter
                  key={month.key}
                  label={month.label}
                  value={month.count}
                  max={reading.peakMonth}

                  readout={String(month.count)}
                />
              ))}
            </div>
            {reading.months.length < MONTHS_FOR_A_TREND ? (
              <p className="border-t border-rule pt-3 text-sm text-ink-muted">
                {reading.totalBakes} {reading.totalBakes === 1 ? 'bake' : 'bakes'} across{' '}
                {reading.months.length}{' '}
                {reading.months.length === 1 ? 'month' : 'months'}. Not enough to read a trend
                yet — only months with a bake in them are drawn.
              </p>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title="Baked more than once">
        {reading.repeated.length > 0 ? (
          <div>
            {reading.repeated.map((item) => (
              <PanelRow
                key={item.recipe!._id}
                label={item.recipe!.title}
                value={`${item.count} bakes`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {nothingLogged
              ? 'Nothing logged yet.'
              : 'Nothing has been baked twice yet, so there is no order to report. This is the panel that answers whether a recipe is getting better, and it needs a second attempt to say anything at all.'}
          </p>
        )}
      </Panel>
    </div>
  );
}
