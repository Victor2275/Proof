import { useMemo, useState } from 'react';
import { BookOpen, Plus, Share2, X } from 'lucide-react';
import type { PantryItem, Recipe, ShoppingItem } from '../lib/types';
import { listAsText, stillNeeded } from '../lib/shopping';
import {
  useAddShoppingItems,
  useDeleteShoppingItems,
  usePantry,
  useRecipes,
  useRestoreRecord,
  useShopping,
  useUpdateShoppingItem,
} from '../lib/queries';
import { byAisle } from '../lib/aisles';
import { parseIngredientLine } from '../lib/parseIngredient';
import { friendlyAmountText } from '../lib/quantities';
import { systemShare } from '../lib/share';
import { haptic } from '../lib/haptics';
import { useUndoableAction } from '../lib/useUndoableAction';
import RecipePickerSheet from './RecipePickerSheet';
import { Button, Field, IconButton, cn, useToast } from './ui';

/*
 * To buy (changes 121–124): one list, kept on the device, in the order a shop
 * is walked.
 *
 * Things arrive three ways — a recipe page's "Add missing to Shop", "Add from
 * a recipe" here, or typed — and all three land in the same saved list, so
 * nothing on it disappears when the page is left. Ticking moves a thing into
 * the basket at the foot of the list rather than striking it out in place;
 * the basket empties with one press, and Undo brings it back.
 */

const EMPTY_SHOPPING: ShoppingItem[] = [];
const EMPTY_PANTRY: PantryItem[] = [];
const EMPTY_RECIPES: Recipe[] = [];

export default function ToBuy() {
  const shopping = useShopping();
  const { data: pantry = EMPTY_PANTRY } = usePantry();
  const { data: recipes = EMPTY_RECIPES } = useRecipes();
  const add = useAddShoppingItems();
  const update = useUpdateShoppingItem();
  const remove = useDeleteShoppingItems();
  const restore = useRestoreRecord();
  const undoable = useUndoableAction();
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const [picking, setPicking] = useState(false);

  const items = shopping.data ?? EMPTY_SHOPPING;
  const toBuy = useMemo(() => items.filter((i) => !i.checked), [items]);
  const basket = useMemo(() => items.filter((i) => i.checked), [items]);
  const aisles = useMemo(() => byAisle(toBuy), [toBuy]);

  const addTyped = async (e: React.FormEvent) => {
    e.preventDefault();
    const line = typed.trim();
    if (!line) return;
    const parsed = parseIngredientLine(line);
    try {
      await add.mutateAsync([{ name: parsed.name || line, quantity: parsed.quantity, unit: parsed.unit }]);
      haptic('light');
      setTyped('');
    } catch {
      toast.show({ message: "Couldn't add that to the list on this device. Try again.", tone: 'fault' });
    }
  };

  const addFrom = (recipe: Recipe) => {
    setPicking(false);
    const needed = stillNeeded(recipe, pantry, items);
    if (!needed.length) {
      toast.show({ message: `You have everything for ${recipe.title}, or it's already on the list.` });
      return;
    }
    let added: string[] = [];
    void undoable({
      message: `Added ${needed.length} from ${recipe.title}`,
      run: async () => {
        added = (await add.mutateAsync(needed)).map((s) => s._id);
      },
      undo: () => remove.mutateAsync(added),
      failure: "Couldn't add those to the list on this device. Try again.",
    });
  };

  const tick = (item: ShoppingItem) => {
    haptic('selection');
    update.mutate({ id: item._id, patch: { checked: !item.checked } });
  };

  const takeOff = (item: ShoppingItem) =>
    void undoable({
      message: `${item.name} taken off the list`,
      run: () => remove.mutateAsync([item._id]),
      undo: () => restore.mutateAsync({ store: 'shopping', id: item._id }),
    });

  const clearBasket = () => {
    const ids = basket.map((i) => i._id);
    void undoable({
      message: `Cleared ${ids.length} from the basket`,
      run: () => remove.mutateAsync(ids),
      undo: async () => {
        for (const id of ids) await restore.mutateAsync({ store: 'shopping', id });
      },
    });
  };

  const share = async () => {
    const text = listAsText(items);
    const outcome = await systemShare({ title: 'To buy', text });
    if (outcome !== 'unavailable') return;
    try {
      await navigator.clipboard.writeText(text);
      toast.show({ message: 'List copied. Paste it into a message.' });
    } catch {
      toast.show({ message: "Couldn't copy the list. Select it and copy by hand.", tone: 'fault' });
    }
  };

  // Read from the device: nothing is drawn while it arrives.
  if (shopping.isPending) return null;
  if (shopping.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-ink">Couldn't read the list on this device.</p>
        <Button onClick={() => shopping.refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <form onSubmit={addTyped} className="flex items-end gap-2">
        <Field
          label="Add to the list"
          hideLabel
          className="min-w-0 flex-1"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="2 lemons, baking paper…"
        />
        <Button type="submit" disabled={!typed.trim()} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2">
        <p className="text-sm tabular-nums text-ink-2" aria-live="polite">
          {toBuy.length === 0 ? 'Nothing to buy' : `${toBuy.length} to buy`}
        </p>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => setPicking(true)} disabled={!recipes.length} icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}>
            Add from a recipe
          </Button>
          {/* Nothing to share is not a list worth sending (change 124). */}
          {toBuy.length > 0 ? (
            <Button variant="ghost" onClick={share} icon={<Share2 className="h-4 w-4" aria-hidden="true" />}>
              Share list
            </Button>
          ) : null}
        </div>
      </div>

      {toBuy.length === 0 ? (
        <p className="max-w-prose text-ink-2">
          {basket.length
            ? 'Everything is in the basket.'
            : 'Add what a recipe needs from its page or with “Add from a recipe”, or type anything above.'}
        </p>
      ) : (
        aisles.map((aisle) => (
          <section key={aisle.id} aria-labelledby={`aisle-${aisle.id}`} className="flex flex-col">
            <h2 id={`aisle-${aisle.id}`} className="ui-label pb-1 text-ink-2">
              {aisle.label}
            </h2>
            <ul className="flex flex-col border-t border-rule">
              {aisle.items.map((item) => (
                <ListRow key={item._id} item={item} onTick={tick} onRemove={takeOff} />
              ))}
            </ul>
          </section>
        ))
      )}

      {basket.length > 0 ? (
        <section aria-labelledby="basket" className="flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-1">
            <h2 id="basket" className="ui-label text-ink-2">
              In the basket
            </h2>
            <Button variant="ghost" onClick={clearBasket}>
              Clear ticked
            </Button>
          </div>
          <ul className="flex flex-col border-t border-rule">
            {basket.map((item) => (
              <ListRow key={item._id} item={item} onTick={tick} onRemove={takeOff} />
            ))}
          </ul>
        </section>
      ) : null}

      <RecipePickerSheet open={picking} onClose={() => setPicking(false)} title="Add from a recipe" recipes={recipes} onPick={addFrom} />
    </div>
  );
}

function ListRow({ item, onTick, onRemove }: { item: ShoppingItem; onTick: (i: ShoppingItem) => void; onRemove: (i: ShoppingItem) => void }) {
  const amount = friendlyAmountText(item.quantity, item.unit);
  return (
    <li className="flex items-center gap-2 border-b border-rule">
      {/* A real checkbox: a shopper works it one-handed in an aisle, and every thumb knows it. */}
      <label className="pressable flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
        <input type="checkbox" checked={item.checked} onChange={() => onTick(item)} className="h-5 w-5 shrink-0 accent-[var(--sage)]" />
        <span className={cn('flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2', item.checked && 'text-ink-muted line-through')}>
          {amount ? <span className="font-semibold tabular-nums">{amount}</span> : null}
          <span className="font-prose min-w-0">{item.name}</span>
          {item.recipeTitle ? <span className="text-sm text-ink-muted">for {item.recipeTitle}</span> : null}
        </span>
      </label>
      <IconButton label={`Take ${item.name} off the list`} icon={<X className="h-4 w-4" aria-hidden="true" />} className="text-ink-muted" onClick={() => onRemove(item)} />
    </li>
  );
}
