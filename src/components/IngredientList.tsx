import type { Recipe } from '../lib/api';
import { Sparkles } from 'lucide-react';
import { Button, cn } from './ui';

/*
 * Ingredients as an instrument panel.
 *
 * Every quantity is a measured value, so quantities are set in mono at a fixed
 * column width and tabular figures: the numbers line up down the list and a
 * baker can read the scale of a recipe without reading the words. The name
 * follows in the reading voice.
 *
 * The pantry lamp is a lamp, not a green tick. Lit means the pantry has it;
 * dark is a designed state rather than an absence of feedback, and the lit
 * state is bone rather than signal — having flour in the cupboard is not an
 * event that is happening now.
 */

interface IngredientListProps {
  recipe: Recipe;
  scaleMultiplier: number;
  showBakersMath: boolean;
  setShowBakersMath: (val: boolean) => void;
  inPantryMap: Record<string, boolean>;
  checkedIngredients: Record<number, boolean>;
  toggleCheck: (index: number) => void;
  setAiSubstituteIngredient: (name: string) => void;
  handleExportGroceryList: () => void;
}

export default function IngredientList({
  recipe,
  scaleMultiplier,
  showBakersMath,
  setShowBakersMath,
  inPantryMap,
  checkedIngredients,
  toggleCheck,
  setAiSubstituteIngredient,
  handleExportGroceryList,
}: IngredientListProps) {
  const ingredients = recipe.ingredients || [];

  // Baker's percentages are always relative to total flour weight, so a recipe
  // with no flour in it has no percentages to show rather than percentages of
  // zero.
  const flourTotal = ingredients.reduce(
    (acc, ing) => ((ing.name || '').toLowerCase().includes('flour') ? acc + (ing.quantity || 0) : acc),
    0,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2">
        <h2 className="label-silkscreen">Ingredients</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleExportGroceryList}>
            Copy list
          </Button>
          <Button
            variant="secondary"
            size="sm"
            engaged={showBakersMath}
            onClick={() => setShowBakersMath(!showBakersMath)}
          >
            Baker&apos;s %
          </Button>
        </div>
      </div>

      <ul className="flex flex-col">
        {ingredients.map((ing, i) => {
          const checked = !!checkedIngredients[i];
          const pct =
            showBakersMath && flourTotal > 0
              ? `${((ing.quantity / flourTotal) * 100).toFixed(1)}%`
              : null;

          return (
            <li key={i} className="group flex items-center gap-3 border-b border-rule py-2.5 last:border-0">
              <label className="flex cursor-pointer items-center p-1.5 -ml-1.5 touch-manipulation">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(i)}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded-key border-rule text-signal focus:ring-signal"
                  aria-label={ing.name}
                />
              </label>

              <span
                className={cn(
                  'w-16 shrink-0 text-right font-mono text-sm tabular-nums sm:w-20',
                  checked ? 'text-ink-muted line-through' : 'text-ink',
                )}
              >
                {Number((ing.quantity * scaleMultiplier).toFixed(2))}
                <span className="ml-1 text-ink-muted">{ing.unit}</span>
              </span>

              {showBakersMath ? (
                <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-ink-muted">
                  {pct}
                </span>
              ) : null}

              <span
                className={cn(
                  'min-w-0 flex-1 break-words',
                  checked ? 'text-ink-muted line-through' : 'text-ink',
                )}
              >
                {ing.name}
              </span>

              {/* The pantry lamp. Square and filled when the pantry has it,
                * hollow when it does not — shape carries the state as well as
                * fill, so it survives a colour vision difference. */}
              <span
                className={cn(
                  'h-2 w-2 shrink-0',
                  inPantryMap[ing.name] ? 'bg-ink' : 'border border-key-unlit',
                )}
                title={inPantryMap[ing.name] ? 'In your pantry' : 'Not in your pantry'}
                aria-hidden="true"
              />
              <span className="sr-only">
                {inPantryMap[ing.name] ? 'In your pantry' : 'Not in your pantry'}
              </span>

              <button
                type="button"
                onClick={() => setAiSubstituteIngredient(ing.name)}
                title={`Substitutions for ${ing.name}`}
                className="label-silkscreen flex shrink-0 items-center gap-1 rounded-control border border-rule px-2 py-1 text-ink-muted opacity-80 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
              >
                {/* At phone width the word does not fit beside a quantity, a
                  * name and a pantry lamp — the icon carries it, and the
                  * button keeps its accessible name from the title. */}
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">Sub</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
