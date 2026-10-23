import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CornerDownLeft, Search } from 'lucide-react';
import type { Recipe } from '../lib/types';
import { useRecipes } from '../lib/queries';
import { useActiveBake } from '../lib/useActiveBake';
import { chapters, searchRecipes } from '../lib/cookbook';
import { Sheet, cn } from './ui';

/*
 * Search or jump to… (⌘K, APP_FEEL_DEBATE L11).
 *
 * One field that reaches anything: a recipe by its name or an ingredient, a
 * chapter, one of the places in the app, or the thing you most often came to
 * do — write a recipe, go back to the bake. It reads the cookbook from the
 * device, so it works with no connection.
 *
 * A combobox in the platform's own grammar: the field keeps focus, the arrow
 * keys move through the options, Enter opens the one chosen, Escape closes.
 * ⌘K or Ctrl+K opens it from anywhere; the top bar has a button for it too.
 */

interface Option {
  id: string;
  group: 'Go to' | 'Recipes' | 'Chapters' | 'Do';
  label: string;
  hint?: string;
  icon?: ReactNode;
  to: string;
}

const PLACES: Option[] = [
  { id: 'go-cookbook', group: 'Go to', label: 'Cookbook', to: '/' },
  { id: 'go-bakes', group: 'Go to', label: 'Bakes', to: '/bakes' },
  { id: 'go-shop', group: 'Go to', label: 'Shop', to: '/shop' },
  { id: 'go-discover', group: 'Go to', label: 'Discover', to: '/discover' },
  { id: 'go-notes', group: 'Go to', label: 'Loose notes', to: '/notes' },
  { id: 'go-published', group: 'Go to', label: 'My published recipes', to: '/published' },
  { id: 'go-settings', group: 'Go to', label: 'Settings', to: '/settings' },
];

const EMPTY: Recipe[] = [];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: recipes = EMPTY } = useRecipes();
  const active = useActiveBake();
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (open) {
      setQuery('');
      setAt(0);
    }
  }, [open]);

  const options = useMemo<Option[]>(() => {
    const q = query.trim().toLowerCase();
    const actions: Option[] = [
      ...(active ? [{ id: 'do-resume', group: 'Do' as const, label: `Resume baking ${active.recipeTitle}`, to: `/recipe/${active.recipeId}/bake` }] : []),
      { id: 'do-new', group: 'Do', label: 'Write a new recipe', to: '/new' },
      { id: 'do-paste', group: 'Do', label: 'Paste a recipe from a link', to: '/new?start=paste' },
    ];
    const recipeHits = (q ? searchRecipes(recipes, q) : recipes.slice(0, 5)).slice(0, 8).map<Option>((r) => ({
      id: `r-${r._id}`,
      group: 'Recipes',
      label: r.title,
      hint: r.folder && r.folder !== 'Uncategorized' ? r.folder : undefined,
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
      to: `/recipe/${r._id}`,
    }));
    const chapterHits = q
      ? chapters(recipes)
          .filter((c) => c.name.toLowerCase().includes(q))
          .slice(0, 4)
          .map<Option>((c) => ({ id: `c-${c.name}`, group: 'Chapters', label: c.name, hint: `${c.count}`, to: `/?chapter=${encodeURIComponent(c.name)}` }))
      : [];
    const match = (o: Option) => !q || o.label.toLowerCase().includes(q);
    return [...actions.filter(match), ...recipeHits, ...chapterHits, ...PLACES.filter(match)];
  }, [query, recipes, active]);

  const choose = (o: Option | undefined) => {
    if (!o) return;
    onClose();
    navigate(o.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAt((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAt((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(options[at]);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${at}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [at, listId]);

  let lastGroup = '';
  return (
    <Sheet open={open} onClose={onClose} label="Search or jump to" size="lg" initialFocus={inputRef} className="self-start sm:mt-[12vh]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-rule-strong bg-paper-raised px-3 focus-within:border-ink">
          <Search className="h-[18px] w-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={options[at] ? `${listId}-${at}` : undefined}
            aria-label="Search or jump to"
            placeholder="Search recipes, chapters, places…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAt(0);
            }}
            onKeyDown={onKeyDown}
            className="min-h-12 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="flex max-h-[55vh] flex-col overflow-y-auto">
          {options.length === 0 ? (
            <li className="px-2 py-3 text-ink-2" role="presentation">
              Nothing matches “{query.trim()}”.
            </li>
          ) : null}
          {options.map((o, i) => {
            const heading = o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return (
              <li key={o.id} role="presentation">
                {heading ? (
                  <p className="ui-label px-2 pb-1 pt-3" aria-hidden="true">
                    {heading}
                  </p>
                ) : null}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === at}
                  onPointerMove={() => setAt(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-[0.9375rem]',
                    i === at ? 'bg-paper-tonal text-ink' : 'text-ink-2',
                  )}
                >
                  {o.icon ?? <span className="w-4" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint ? <span className="shrink-0 text-sm text-ink-muted">{o.hint}</span> : null}
                  {i === at ? <CornerDownLeft className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
