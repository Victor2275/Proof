import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Check, Minus, Plus, ShoppingBasket, Sparkles } from 'lucide-react';
import type { Component, PantryItem, ShoppingItem } from '../lib/types';
import { bakersMath } from '../lib/bakersMath';
import { friendlyAmount, ingredientParts } from '../lib/quantities';
import { cleanText } from '../lib/recipeText';
import { usePantry, useShopping, useAddShoppingItems, useDeleteShoppingItems } from '../lib/queries';
import { useUndoableAction } from '../lib/useUndoableAction';
import { haptic } from '../lib/haptics';
import { SETTINGS_KEYS } from '../lib/settings';
import { baseServings } from '../lib/facts';
import { Button, IconButton, cn } from './ui';

/*
 * The ingredients, as a cookbook prints them (changes 70–76).
 *
 * One tick per row, for mise en place: the whole row is the control. The
 * amount is a kitchen fraction in its own column; a weight the recipe wrote
 * into the name moves to a quiet column on the right. The pantry only speaks
 * when there is one, and only to say "have" — ten lines of "Not in your
 * pantry" for someone who never set one up was ten lines of nothing.
 *
 * Serves is a stepper on the heading. Baker's percentages appear only for a
 * recipe whose flour is weighed, as a column of the same table.
 */

const EMPTY_PANTRY: PantryItem[] = [];
const EMPTY_SHOPPING: ShoppingItem[] = [];
const EMPTY_INGREDIENTS: Component[] = [];

export interface IngredientListProps {
  recipe: { _id: string; title: string; ingredients?: Component[]; servings?: number | null };
  /** The servings the list is drawn for; the recipe's own count is the base. */
  servings: number;
  onServingsChange?: (servings: number) => void;
  checked: Record<number, boolean>;
  onToggle: (index: number) => void;
  onSubstitute?: (name: string) => void;
}

export default function IngredientList({ recipe, servings, onServingsChange, checked, onToggle, onSubstitute }: IngredientListProps) {
  const ingredients = recipe.ingredients ?? EMPTY_INGREDIENTS;
  const base = baseServings(recipe);
  const scale = servings / base;
  const { data: pantry = EMPTY_PANTRY } = usePantry();
  const { data: shopping = EMPTY_SHOPPING } = useShopping();
  const addShopping = useAddShoppingItems();
  const removeShopping = useDeleteShoppingItems();
  const undoable = useUndoableAction();
  // Settings → Baker's math turns the column on by default, where there is one.
  const [percent, setPercent] = useState(() => localStorage.getItem(SETTINGS_KEYS.defaultBakersMath) === 'true');
  const math = bakersMath(ingredients);

  const have = useMemo(() => {
    const set = new Set<number>();
    if (!pantry.length) return set;
    const fuse = new Fuse(pantry, { keys: ['name'], threshold: 0.35 });
    ingredients.forEach((ing, i) => {
      if (fuse.search(ingredientParts(cleanText(ing.name)).name).length) set.add(i);
    });
    return set;
  }, [ingredients, pantry]);

  const onList = useMemo(() => {
    const names = new Set(shopping.filter((s) => s.recipeId === recipe._id && !s.checked).map((s) => s.name.toLowerCase()));
    const set = new Set<number>();
    ingredients.forEach((ing, i) => {
      if (names.has(ingredientParts(cleanText(ing.name)).name.toLowerCase())) set.add(i);
    });
    return set;
  }, [ingredients, shopping, recipe._id]);

  const missing = ingredients
    .map((ing, i) => ({ ing, i }))
    .filter(({ i }) => !have.has(i) && !onList.has(i));

  const addMissing = () => {
    const items = missing.map(({ ing }) => ({
      name: ingredientParts(cleanText(ing.name)).name,
      quantity: ing.quantity === null ? null : Number((ing.quantity * scale).toFixed(3)),
      unit: ing.unit,
      recipeId: recipe._id,
      recipeTitle: recipe.title,
    }));
    let added: string[] = [];
    haptic('light');
    void undoable({
      message: `Added ${items.length} to Shop`,
      run: async () => {
        added = (await addShopping.mutateAsync(items)).map((s) => s._id);
      },
      undo: () => removeShopping.mutateAsync(added),
      failure: "Couldn't add those to the list on this device. Try again.",
    });
  };

  const step = (by: number) => {
    const next = Math.min(base * 8, Math.max(1, servings + by));
    if (next !== servings) {
      haptic('selection');
      onServingsChange?.(next);
    }
  };

  const preview = missing
    .slice(0, 2)
    .map(({ ing }) => ingredientParts(cleanText(ing.name)).name)
    .join(', ');

  return (
    <section aria-labelledby="ingredients-heading" className="flex flex-col">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-rule pb-2.5">
        <h2 id="ingredients-heading" className="font-title text-2xl text-ink">
          Ingredients
        </h2>
        <div className="flex items-center gap-2">
          {math.ok ? (
            <Button size="sm" variant="ghost" engaged={percent} onClick={() => setPercent((v) => !v)}>
              Baker&apos;s %
            </Button>
          ) : null}
          {onServingsChange ? (
            <div role="group" aria-label="Servings" className="flex items-center gap-0.5 rounded-full bg-paper-tonal p-[3px] text-sm">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={servings <= 1}
                aria-label="Fewer servings"
                className="pressable flex h-[38px] w-[38px] items-center justify-center rounded-full bg-paper-raised text-ink disabled:opacity-40"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <output aria-live="polite" className="min-w-[4.5rem] text-center tabular-nums text-ink">
                Serves {servings}
              </output>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="More servings"
                className="pressable flex h-[38px] w-[38px] items-center justify-center rounded-full bg-paper-raised text-ink"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {servings !== base ? (
        <p className="pt-2 text-sm text-ink-muted">
          Scaled from {base}.{' '}
          {onServingsChange ? (
            <button type="button" onClick={() => onServingsChange(base)} className="pressable rounded-control px-1 font-medium text-ink">
              Back to {base}
            </button>
          ) : null}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {ingredients.map((ing, i) => {
          const parts = ingredientParts(cleanText(ing.name), scale);
          const amount = friendlyAmount(ing.quantity, ing.unit, scale);
          const done = !!checked[i];
          const side = onList.has(i) ? 'On list' : have.has(i) ? 'Have' : parts.weight;
          // An ingredient that is not weighed has no share of the flour: a dash, not a gap.
          const share = percent && math.ok ? math.percentages[i] : undefined;
          return (
            <li key={i} className="group flex items-stretch border-b border-rule">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => {
                  haptic('light');
                  onToggle(i);
                }}
                className="pressable -mx-1.5 flex min-h-12 min-w-0 flex-1 items-baseline gap-3 rounded-key px-1.5 py-2.5 text-left hover:bg-paper-sunk"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center self-center rounded-full border-[1.5px]',
                    done ? 'border-sage bg-sage text-paper' : 'border-rule-strong',
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span className={cn('w-[4.25rem] shrink-0 font-sans text-[0.9375rem] font-semibold tabular-nums text-ink', done && 'text-ink-muted line-through')}>
                  {amount.quantity}
                  {amount.unit ? <span className="font-normal"> {amount.unit}</span> : null}
                </span>
                <span className={cn('font-prose min-w-0 flex-1 text-[1.0625rem] leading-snug text-ink', done && 'text-ink-muted line-through')}>
                  {parts.name}
                  {parts.note ? <span className="italic text-ink-muted">, {parts.note}</span> : null}
                </span>
                {share !== undefined ? (
                  <span className="w-12 shrink-0 text-right font-sans text-sm tabular-nums text-ink-2">
                    {share === null ? '—' : `${share.toFixed(1)}%`}
                  </span>
                ) : null}
                {side ? (
                  <span
                    className={cn(
                      'shrink-0 font-sans text-[0.8125rem] tabular-nums',
                      side === 'Have' ? 'text-sage' : side === 'On list' ? 'text-pencil' : 'text-ink-muted',
                    )}
                  >
                    {side === 'Have' ? '✓ have' : side}
                  </span>
                ) : null}
              </button>
              {onSubstitute ? (
                <IconButton
                  label={`Substitutes for ${parts.name}`}
                  icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => onSubstitute(parts.name)}
                  className="self-center text-ink-muted [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {percent && math.ok ? (
        <p className="pt-2 text-sm text-ink-muted">Each weighed ingredient as a share of the flour, which is 100%.</p>
      ) : null}

      {missing.length > 0 ? (
        <Button
          variant="tonal"
          onClick={addMissing}
          className="mt-4 h-auto min-h-14 justify-start gap-3 px-4 py-2 text-left"
          icon={<ShoppingBasket className="h-5 w-5 shrink-0" aria-hidden="true" />}
        >
          <span className="flex flex-col">
            <span>
              {missing.length === ingredients.length && !pantry.length
                ? `Add all ${missing.length} to Shop`
                : `Add ${missing.length} missing to Shop`}
            </span>
            <span className="text-[0.8125rem] font-normal text-ink-muted">
              {preview}
              {missing.length > 2 ? ` +${missing.length - 2}` : ''}
            </span>
          </span>
        </Button>
      ) : ingredients.length > 0 && (have.size > 0 || onList.size > 0) ? (
        <p className="mt-4 text-sm text-ink-muted">
          {onList.size > 0 ? 'Everything you need is in the cupboard or on the list.' : 'Everything is in the cupboard.'}
        </p>
      ) : null}
    </section>
  );
}
