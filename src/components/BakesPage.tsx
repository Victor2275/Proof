import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Plus, X } from 'lucide-react';
import type { BakeLog, Recipe } from '../lib/types';
import { useBakeLogs, useRecipes } from '../lib/queries';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { firstLine } from '../lib/recipeText';
import { summaryLine } from '../lib/cookbook';
import { AccountSheetButton } from './AccountMenu';
import BakeDetailSheet from './BakeDetailSheet';
import CompareBakesSheet from './CompareBakesSheet';
import LogBakeSheet from './LogBakeSheet';
import RecipePickerSheet from './RecipePickerSheet';
import { Button, PageHeader, Photo, Segmented, Sparkline, Stamp, Stars, cn } from './ui';

/*
 * Bakes: the bake log's own place (UI overhaul Phase 4, changes 98–108).
 *
 * Two readings of one log. The journal runs by month, newest first: each bake
 * a line with its photograph or a note card, the recipe, the date and its
 * number, the stars and the first line of what happened. By recipe keeps the
 * oldest-to-newest progression of each recipe baked more than once, with its
 * stars as a line once there are three; recipes baked once are gathered in one
 * short list rather than a row each.
 *
 * Above both, one line of what the log can say — "17 bakes · 6 recipes · best:
 * Cheesecake" — in place of the totals page and its "6 of 203 baked" meter.
 * Compare turns the bakes into ticks; two ticked, a bar offers to set them
 * side by side. `?recipe=` narrows the page to one recipe's bakes.
 */

type View = 'journal' | 'recipe';
const EMPTY_LOGS: BakeLog[] = [];
const EMPTY_RECIPES: Recipe[] = [];

const monthOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function BakesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'recipe' ? 'recipe' : 'journal';
  const only = params.get('recipe');
  const { data: allBakes = EMPTY_LOGS } = useBakeLogs();
  const { data: recipes = EMPTY_RECIPES } = useRecipes();
  const byId = useMemo(() => new Map(recipes.map((r) => [r._id, r])), [recipes]);
  const bakes = useMemo(() => (only ? allBakes.filter((b) => b.recipeId === only) : allBakes), [allBakes, only]);

  // A bake's number counts that recipe's bakes from the oldest.
  const number = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Map<string, number>();
    for (const b of [...allBakes].reverse()) {
      const n = (seen.get(b.recipeId) ?? 0) + 1;
      seen.set(b.recipeId, n);
      map.set(b._id, n);
    }
    return map;
  }, [allBakes]);

  const [comparing, setComparing] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BakeLog | null>(null);
  const [picking, setPicking] = useState(false);

  const open = allBakes.find((b) => b._id === openId) ?? null;
  const openRecipe = open ? byId.get(open.recipeId) ?? null : null;
  const recentIds = useMemo(() => [...new Set(allBakes.map((b) => b.recipeId))], [allBakes]);

  const press = (log: BakeLog) => {
    if (!comparing) {
      setOpenId(log._id);
      return;
    }
    setTicked((t) => (t.includes(log._id) ? t.filter((x) => x !== log._id) : t.length >= 2 ? [t[1], log._id] : [...t, log._id]));
  };

  const filtered = only ? byId.get(only) : null;
  const title = filtered ? filtered.title : 'Bakes';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={title}
        subtitle={summaryLine(bakes, byId) || undefined}
        actions={
          <>
            <Button className="rounded-full pl-3" icon={<Plus className="h-[18px] w-[18px]" aria-hidden="true" />} onClick={() => (filtered ? navigate(`/recipe/${filtered._id}?log=1`) : setPicking(true))} aria-haspopup="dialog">
              Log bake
            </Button>
            <AccountSheetButton className="md:hidden" />
          </>
        }
      />

      {filtered ? (
        <div className="-mt-3 flex flex-wrap items-center gap-2">
          <Link to={`/recipe/${filtered._id}`} className="pressable inline-flex min-h-11 items-center gap-1 rounded-full px-1 text-sm font-medium text-ink-2 hover:text-ink">
            Open the recipe
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={() => setParams(view === 'recipe' ? { view } : {}, { replace: true })}>
            Every recipe
          </Button>
        </div>
      ) : null}

      {allBakes.length ? (
        <div className="flex items-center gap-2.5">
          <Segmented
            label="Bakes view"
            block
            className="flex-1 sm:max-w-80"
            value={view}
            onChange={(next) => {
              const p: Record<string, string> = {};
              if (next === 'recipe') p.view = 'recipe';
              if (only) p.recipe = only;
              setParams(p, { replace: true });
            }}
            options={[
              { value: 'journal', label: 'Journal' },
              { value: 'recipe', label: 'By recipe' },
            ]}
          />
          <Button
            engaged={comparing}
            onClick={() => {
              setComparing((c) => !c);
              setTicked([]);
            }}
          >
            {comparing ? 'Done' : 'Compare'}
          </Button>
        </div>
      ) : null}

      {comparing ? <p className="-mt-3 text-sm text-ink-2">Tick two bakes to set them side by side.</p> : null}

      {bakes.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-prose text-ink-2">
            {only
              ? "This recipe hasn't been baked yet."
              : 'No bakes yet. Each time you make something, log it — a photograph, how it went, what to change — and it is kept here, and on the recipe.'}
          </p>
          <Button variant="primary" onClick={() => (filtered ? navigate(`/recipe/${filtered._id}?log=1`) : setPicking(true))}>
            Log a bake
          </Button>
        </div>
      ) : view === 'journal' ? (
        <Journal bakes={bakes} recipes={byId} number={number} comparing={comparing} ticked={ticked} onPress={press} />
      ) : (
        <ByRecipe bakes={bakes} recipes={byId} number={number} comparing={comparing} ticked={ticked} onPress={press} />
      )}

      {comparing ? (
        <div className="above-nav fixed inset-x-0 z-20 flex justify-center px-3">
          <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-panel border border-rule bg-paper-raised px-4 py-2 shadow-[var(--lift-sheet)]">
            <span className="text-sm text-ink-2" aria-live="polite">
              {ticked.length} of 2 ticked
            </span>
            <Button variant="primary" disabled={ticked.length !== 2} onClick={() => setCompareOpen(true)}>
              Compare ({ticked.length})
            </Button>
          </div>
        </div>
      ) : null}

      <BakeDetailSheet
        log={open}
        number={open ? number.get(open._id) : undefined}
        recipe={openRecipe}
        onClose={() => setOpenId(null)}
        onEdit={(log) => {
          setOpenId(null);
          setEditing(log);
        }}
        onShareCard={openRecipe ? (log) => navigate(`/recipe/${log.recipeId}?makeId=${log._id}&export=instagram`) : undefined}
      />
      {editing && byId.get(editing.recipeId) ? (
        <LogBakeSheet open onClose={() => setEditing(null)} recipe={byId.get(editing.recipeId)!} log={editing} />
      ) : null}
      <CompareBakesSheet
        bakes={compareOpen ? allBakes.filter((b) => ticked.includes(b._id)) : null}
        recipes={byId}
        onClose={() => setCompareOpen(false)}
      />
      <RecipePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Log a bake of…"
        recipes={recipes}
        first={recentIds}
        onPick={(r) => {
          setPicking(false);
          navigate(`/recipe/${r._id}?log=1`);
        }}
      />
    </div>
  );
}

interface ListProps {
  bakes: BakeLog[];
  recipes: Map<string, Recipe>;
  number: Map<string, number>;
  comparing: boolean;
  ticked: string[];
  onPress: (log: BakeLog) => void;
}

/** A small square for a bake: its own photograph, or a note card with the recipe's initial. */
function BakeThumb({ log, recipe, size = 'h-16 w-16' }: { log: BakeLog; recipe: Recipe | undefined; size?: string }) {
  const photo = bakePhotoUrls(log)[0];
  return photo ? (
    <Photo src={photo} alt="" className={cn(size, 'shrink-0 rounded-key object-cover')} />
  ) : (
    <span aria-hidden="true" className={cn(size, 'font-title flex shrink-0 items-center justify-center rounded-key bg-paper-sunk text-2xl italic text-pencil')}>
      {(recipe?.title ?? '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full border-[1.5px]',
        on ? 'border-ink bg-ink text-paper' : 'border-rule-strong',
      )}
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

function Journal({ bakes, recipes, number, comparing, ticked, onPress }: ListProps) {
  const months: { name: string; bakes: BakeLog[] }[] = [];
  for (const b of bakes) {
    const name = monthOf(b.date);
    const last = months[months.length - 1];
    if (last?.name === name) last.bakes.push(b);
    else months.push({ name, bakes: [b] });
  }
  return (
    <div className="flex flex-col gap-6">
      {months.map((m) => (
        <section key={m.name} aria-labelledby={`month-${m.name}`} className="flex flex-col">
          <h2 id={`month-${m.name}`} className="font-title mb-1 text-xl italic text-ink-2">
            {m.name}
          </h2>
          <ul>
            {m.bakes.map((log) => {
              const recipe = recipes.get(log.recipeId);
              const note = firstLine(log.notes) || log.nextTime || '';
              const on = ticked.includes(log._id);
              return (
                <li key={log._id} className="border-b border-rule">
                  <button
                    type="button"
                    onClick={() => onPress(log)}
                    aria-pressed={comparing ? on : undefined}
                    className="pressable relative -mx-1.5 flex w-full gap-3.5 rounded-key px-1.5 py-3.5 text-left hover:bg-paper-sunk"
                  >
                    {comparing ? <Tick on={on} /> : null}
                    <BakeThumb log={log} recipe={recipe} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-12">
                      <span className="font-title text-lg leading-snug text-ink">{recipe?.title ?? 'A deleted recipe'}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                        {shortDate(log.date)} · Bake {number.get(log._id)}
                        <Stars value={log.rating} />
                      </span>
                      {note ? <span className="font-prose line-clamp-2 italic leading-snug text-ink-2">“{note}”</span> : null}
                    </span>
                    {log.isPersonalBest ? <Stamp rating={log.rating} className="absolute right-1 top-2" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ByRecipe({ bakes, recipes, number, comparing, ticked, onPress }: ListProps) {
  const groups = new Map<string, BakeLog[]>();
  for (const b of [...bakes].reverse()) groups.set(b.recipeId, [...(groups.get(b.recipeId) ?? []), b]);
  // Most recently baked first.
  const ordered = [...groups.entries()].sort((a, b) => b[1][b[1].length - 1].date.localeCompare(a[1][a[1].length - 1].date));
  const many = ordered.filter(([, list]) => list.length > 1);
  const once = ordered.filter(([, list]) => list.length === 1);

  return (
    <div className="flex flex-col gap-8">
      {many.map(([id, list]) => {
        const recipe = recipes.get(id);
        const rated = list.filter((b) => b.rating).map((b) => b.rating!);
        return (
          <section key={id} aria-labelledby={`r-${id}`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-rule pb-2">
              <h2 id={`r-${id}`} className="font-title min-w-0 text-xl text-ink">
                {recipe ? (
                  <Link to={`/recipe/${id}`} className="pressable rounded-control hover:text-ink-2">
                    {recipe.title}
                  </Link>
                ) : (
                  'A deleted recipe'
                )}
              </h2>
              <span className="flex shrink-0 items-center gap-3">
                <Sparkline values={rated} label={recipe?.title ?? 'This recipe'} />
                <span className="text-sm text-ink-muted">{list.length} bakes</span>
              </span>
            </div>
            <ol className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {list.map((log) => {
                const on = ticked.includes(log._id);
                return (
                  <li key={log._id} className="relative w-32 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPress(log)}
                      aria-pressed={comparing ? on : undefined}
                      aria-label={`Bake ${number.get(log._id)}, ${shortDate(log.date)}${log.rating ? `, ${log.rating} of 5 stars` : ''}`}
                      className={cn('pressable flex w-full flex-col gap-1.5 rounded-key text-left', on && 'outline-2 outline-offset-2 outline-ink')}
                    >
                      {bakePhotoUrls(log)[0] ? (
                        <BakeThumb log={log} recipe={recipe} size="aspect-square w-full" />
                      ) : (
                        <span className="flex aspect-square w-full flex-col justify-between rounded-key bg-paper-sunk p-2.5">
                          <span className="font-title text-2xl leading-none text-pencil">{number.get(log._id)}</span>
                          <span className="font-prose line-clamp-3 text-[0.8125rem] italic leading-snug text-ink-2">
                            {firstLine(log.notes) ? `“${firstLine(log.notes)}”` : 'No notes'}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-ink">
                        {shortDate(log.date)}
                        <Stars value={log.rating} />
                      </span>
                    </button>
                    {comparing ? <span className="absolute left-1.5 top-1.5"><Tick on={on} /></span> : null}
                    {log.isPersonalBest ? <Stamp rating={log.rating} className="pointer-events-none absolute -right-1 -top-1 scale-90" /> : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {once.length ? (
        <section aria-labelledby="baked-once" className="flex flex-col">
          <h2 id="baked-once" className="font-title border-b border-rule pb-2 text-xl text-ink">
            Baked once
          </h2>
          <ul>
            {once.map(([id, [log]]) => {
              const recipe = recipes.get(id);
              const on = ticked.includes(log._id);
              return (
                <li key={id} className="border-b border-rule">
                  <button
                    type="button"
                    onClick={() => onPress(log)}
                    aria-pressed={comparing ? on : undefined}
                    className="pressable -mx-1.5 flex w-full items-center gap-3 rounded-key px-1.5 py-2 text-left hover:bg-paper-sunk"
                  >
                    {comparing ? <Tick on={on} /> : null}
                    <BakeThumb log={log} recipe={recipe} size="h-11 w-11" />
                    <span className="font-title min-w-0 flex-1 text-[1.0625rem] text-ink">{recipe?.title ?? 'A deleted recipe'}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                      {shortDate(log.date)}
                      <Stars value={log.rating} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
