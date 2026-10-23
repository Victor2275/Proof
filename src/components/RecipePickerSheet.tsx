import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Recipe } from '../lib/types';
import { searchRecipes } from '../lib/cookbook';
import { Field, RecipePlate, Sheet } from './ui';

/*
 * Choosing a recipe: "Log a bake of…", "Add from a recipe…". A searchable list
 * rather than a wall of buttons — the ones most likely wanted (baked lately,
 * favourites) first, and the whole cookbook a few letters away.
 */
export interface RecipePickerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  recipes: Recipe[];
  /** Ids to put first, in this order: the recently baked. */
  first?: string[];
  onPick: (recipe: Recipe) => void;
}

export default function RecipePickerSheet({ open, onClose, title, recipes, first = [], onPick }: RecipePickerSheetProps) {
  const [query, setQuery] = useState('');
  const ordered = useMemo(() => {
    const rank = new Map(first.map((id, i) => [id, i]));
    const favourite = (r: Recipe) => (r.tags?.includes('Favorite') ? 0 : 1);
    return [...recipes].sort(
      (a, b) =>
        (rank.get(a._id) ?? Infinity) - (rank.get(b._id) ?? Infinity) ||
        favourite(a) - favourite(b) ||
        a.title.localeCompare(b.title),
    );
  }, [recipes, first]);
  const shown = (query.trim() ? searchRecipes(ordered, query) : ordered).slice(0, 60);

  return (
    <Sheet
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={title}
      placement="bottom"
      size="md"
      detents
      initialDetent={1}
    >
      <div className="flex flex-col gap-3">
        <Field
          label="Find a recipe"
          hideLabel
          type="search"
          leading={<Search className="h-4 w-4" aria-hidden="true" />}
          placeholder="Find a recipe"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {shown.length === 0 ? <p className="text-ink-2">No recipe matches “{query.trim()}”.</p> : null}
        <ul className="flex flex-col">
          {shown.map((r) => (
            <li key={r._id} className="border-b border-rule">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onPick(r);
                }}
                className="pressable -mx-1.5 flex w-full items-center gap-3 rounded-key px-1.5 py-2 text-left hover:bg-paper-sunk"
              >
                <RecipePlate src={r.imageUrls?.[0]} alt="" size="row" className="h-12 w-12 sm:h-12 sm:w-12" />
                <span className="font-title min-w-0 text-lg leading-snug text-ink">{r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
