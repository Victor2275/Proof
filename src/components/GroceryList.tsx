import { useState, useMemo } from 'react';
import type { Recipe, PantryItem, ShoppingItem } from '../lib/types';
import { useDeleteShoppingItems, usePantry, useRecipes, useShopping, useUpdateShoppingItem } from '../lib/queries';
import { formatAmount } from '../lib/ingredients';
import { Copy, Download, Share2, Plus, Trash2, Check } from 'lucide-react';
import Fuse from 'fuse.js';
import { Button, Field, Panel, cn } from './ui';

/*
 * The grocery list — the difference between a bake and the pantry.
 *
 * Nothing here is typed twice: pick the recipes, and what is missing is
 * whatever they call for that the pantry does not already hold. So the surface
 * is a bank and a list. The bank of recipes is a row of keys that latch when
 * engaged, exactly as the transport's controls latch.
 *
 * The list is the one place in this world that keeps a real checkbox rather
 * than a lamp. A lamp reports; this is a control a shopper operates in a
 * supermarket aisle one-handed, and the platform's own checkbox is the thing
 * every assistive technology and every thumb already knows. State is carried
 * three ways — the box, a strike-through, and the count above the list — so it
 * never depends on one of them landing.
 */

/** How many recipe keys the bank shows before asking you to search. */
const BANK_LIMIT = 12;

export interface GroceryItem {
  id: string;
  name: string;
  /** null for "to taste", "to serve": there is nothing to buy a measure of. */
  quantity: number | null;
  unit: string;
  checked: boolean;
  sourceRecipe?: string;
}

const EMPTY_RECIPES: Recipe[] = [];
const EMPTY_PANTRY: PantryItem[] = [];
const EMPTY_SAVED: ShoppingItem[] = [];

/** `embedded`: drawn inside the Shop destination, which names the page itself. */
export default function GroceryList({ embedded = false }: { embedded?: boolean } = {}) {
  const recipesQuery = useRecipes();
  const pantryQuery = usePantry();
  const recipes = recipesQuery.data ?? EMPTY_RECIPES;
  const pantry = pantryQuery.data ?? EMPTY_PANTRY;
  // What a recipe page added ("Add missing to Shop"), kept on the device.
  const { data: saved = EMPTY_SAVED } = useShopping();
  const updateSaved = useUpdateShoppingItem();
  const deleteSaved = useDeleteShoppingItems();
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<GroceryItem[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('');
  const [copied, setCopied] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState('');

  const toggleRecipeSelection = (id: string) => {
    setSelectedRecipeIds(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const groceryItems = useMemo(() => {
    const fuse = new Fuse(pantry, { keys: ['name'], threshold: 0.35 });
    const items: GroceryItem[] = [];

    // Process selected recipes
    const selectedRecipes = recipes.filter(r => r._id && selectedRecipeIds.includes(r._id));
    selectedRecipes.forEach(rec => {
      rec.ingredients?.forEach((ing, idx) => {
        const matches = fuse.search(ing.name);
        const inPantry = matches.length > 0;

        // Include if not in pantry
        if (!inPantry) {
          items.push({
            id: `${rec._id}-${idx}-${ing.name}`,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            checked: !!checkedItemIds[`${rec._id}-${idx}-${ing.name}`],
            sourceRecipe: rec.title
          });
        }
      });
    });

    saved.forEach((item) => {
      items.push({
        id: `saved-${item._id}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        checked: item.checked,
        sourceRecipe: item.recipeTitle,
      });
    });

    // Append manual items
    manualItems.forEach(item => {
      items.push({
        ...item,
        checked: !!checkedItemIds[item.id]
      });
    });

    return items;
  }, [recipes, pantry, selectedRecipeIds, manualItems, checkedItemIds, saved]);

  const toggleCheckItem = (id: string) => {
    if (id.startsWith('saved-')) {
      const item = saved.find((s) => `saved-${s._id}` === id);
      if (item) updateSaved.mutate({ id: item._id, patch: { checked: !item.checked } });
      return;
    }
    setCheckedItemIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const addManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;
    const newItem: GroceryItem = {
      id: `manual-${Date.now()}`,
      name: newCustomName.trim(),
      quantity: Number.isFinite(parseFloat(newCustomQty)) ? parseFloat(newCustomQty) : null,
      unit: newCustomUnit.trim(),
      checked: false
    };
    setManualItems(prev => [...prev, newItem]);
    setNewCustomName('');
    setNewCustomQty('');
    setNewCustomUnit('');
  };

  const removeManualItem = (id: string) => {
    setManualItems(prev => prev.filter(i => i.id !== id));
  };

  const formatListForExport = () => {
    if (groceryItems.length === 0) return 'Grocery List is empty.';
    let text = '🛒 Proof Grocery List\n';
    text += '============================\n\n';

    groceryItems.forEach(item => {
      const mark = item.checked ? '[x]' : '[ ]';
      const qtyStr = formatAmount(item);
      const recipeStr = item.sourceRecipe ? ` (${item.sourceRecipe})` : '';
      text += `${mark} ${item.name} ${qtyStr}${recipeStr}\n`;
    });

    return text;
  };

  const copyToClipboard = async () => {
    const formatted = formatListForExport();
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const formatted = formatListForExport();
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-list-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareList = async () => {
    const formatted = formatListForExport();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grocery List',
          text: formatted
        });
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const remaining = groceryItems.filter(i => !i.checked).length;

  /*
   * The bank shows a dozen keys, not the whole cookbook. A library of 203
   * recipes rendered as 203 latching keys is a wall a shopper has to scroll
   * past to reach the list, which is the actual subject of this page. Anything
   * already engaged stays on the panel whatever the search says — you have to
   * be able to see what is feeding the list in order to switch it off.
   */
  const bank = useMemo(() => {
    const query = recipeQuery.trim().toLowerCase();
    const matches = query
      ? recipes.filter(r => (r.title || '').toLowerCase().includes(query))
      : recipes;
    const shown = matches.slice(0, BANK_LIMIT);
    const selected = recipes.filter(r => r._id && selectedRecipeIds.includes(r._id));
    const list = [
      ...selected,
      ...shown.filter(r => !r._id || !selectedRecipeIds.includes(r._id)),
    ];
    return { list, hidden: matches.length - shown.length };
  }, [recipes, recipeQuery, selectedRecipeIds]);

  // Read from the device: nothing is drawn while it arrives (B30).
  if (recipesQuery.isPending || pantryQuery.isPending) return null;

  // A failed read is said as one, not drawn as an empty cookbook (audit #3).
  const failed = recipesQuery.error ?? pantryQuery.error;
  if (failed) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-20">
        {embedded ? null : (
          <h1 className="font-title border-b border-rule pb-6 text-3xl leading-none text-ink sm:text-4xl">Grocery list</h1>
        )}
        <Panel title="This device">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">Couldn't read the cookbook and pantry on this device, so there is no list to build.</p>
            <Button
              className="self-start"
              onClick={() => {
                void recipesQuery.refetch();
                void pantryQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-20">
      <header
        className={
          embedded
            ? 'flex flex-wrap gap-2'
            : 'flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between'
        }
      >
        {embedded ? null : (
          <div className="flex flex-col gap-2">
            <h1 className="font-title text-3xl leading-none text-ink sm:text-4xl">Grocery list</h1>
            <p className="max-w-prose text-ink-muted">
              Pick what you are baking. Everything those recipes need that the pantry does not
              already hold lands on the list.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={copyToClipboard}
            engaged={copied}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copied' : 'Copy list'}
          </Button>
          <Button onClick={downloadTxt} icon={<Download className="h-4 w-4" />}>
            Download
          </Button>
          <Button onClick={shareList} icon={<Share2 className="h-4 w-4" />}>
            Share
          </Button>
        </div>
      </header>

      {/*
        The recipe bank. Keys latch: engaged means this recipe's ingredients are
        feeding the list, which is the same "engaged control" language the
        transport and the scale toggle use.
      */}
      <Panel title="Shopping for">
        {recipes.length === 0 ? (
          <p className="text-ink-muted">No recipes yet — add one and it will appear here.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Field
              label="Find a recipe"
              hideLabel
              value={recipeQuery}
              onChange={e => setRecipeQuery(e.target.value)}
              placeholder="Find a recipe…"
            />

            <div className="flex flex-wrap gap-2">
              {bank.list.map(recipe => {
                const selected = selectedRecipeIds.includes(recipe._id!);
                return (
                  <Button
                    key={recipe._id}
                    engaged={selected}
                    aria-pressed={selected}
                    onClick={() => toggleRecipeSelection(recipe._id!)}
                    className="max-w-full"
                  >
                    <span className="truncate">{recipe.title}</span>
                  </Button>
                );
              })}
            </div>

            {bank.list.length === 0 ? (
              <p className="text-ink-muted">Nothing in the cookbook matches “{recipeQuery}”.</p>
            ) : bank.hidden > 0 ? (
              <span className="ui-label text-silkscreen">
                {bank.hidden} more — search to narrow
              </span>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title="Add an extra">
        <form onSubmit={addManualItem} className="flex flex-wrap items-end gap-3">
          <Field
            label="Item"
            hideLabel
            placeholder="Item name (e.g. Parchment Paper)"
            value={newCustomName}
            onChange={e => setNewCustomName(e.target.value)}
            className="min-w-0 flex-1 basis-full sm:basis-48"
          />
          <Field
            label="Quantity"
            hideLabel
            type="number"
            step="any"
            placeholder="Qty"
            value={newCustomQty}
            onChange={e => setNewCustomQty(e.target.value)}
            className="w-24"
          />
          <Field
            label="Unit"
            hideLabel
            placeholder="Unit"
            value={newCustomUnit}
            onChange={e => setNewCustomUnit(e.target.value)}
            className="w-28"
          />
          <Button type="submit" icon={<Plus className="h-4 w-4" />}>
            Add
          </Button>
        </form>
      </Panel>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 className="ui-label">Checklist</h2>
          <div className="flex items-baseline gap-4">
            {selectedRecipeIds.length > 0 && (
              <span className="ui-label text-silkscreen">
                against {pantry.length} in stock
              </span>
            )}
            <span className="font-sans text-sm tabular-nums text-ink">
              {remaining} remaining
            </span>
          </div>
        </div>

        {groceryItems.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-panel border border-rule bg-panel p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 border border-key-unlit" aria-hidden="true" />
              <span className="ui-label text-silkscreen">Nothing to buy</span>
            </div>
            <p className="max-w-prose text-ink-muted">
              Select a recipe above, or add an extra item by hand.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-rule border-y border-rule">
            {groceryItems.map(item => (
              <li key={item.id} className="flex items-center gap-3 pr-1">
                <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheckItem(item.id)}
                    className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                  />
                  <span
                    className={cn(
                      'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5',
                      item.checked && 'text-ink-muted line-through opacity-60',
                    )}
                  >
                    <span className="min-w-0 truncate text-ink">{item.name}</span>
                    {formatAmount(item) ? (
                      <span className="font-sans text-sm tabular-nums text-ink-muted">{formatAmount(item)}</span>
                    ) : null}
                    {item.sourceRecipe ? (
                      <span className="ui-label text-silkscreen">{item.sourceRecipe}</span>
                    ) : null}
                  </span>
                </label>

                {(item.id.startsWith('manual-') || item.id.startsWith('saved-')) && (
                  <button
                    type="button"
                    onClick={() =>
                      item.id.startsWith('saved-') ? deleteSaved.mutate([item.id.slice('saved-'.length)]) : removeManualItem(item.id)
                    }
                    aria-label={`Remove ${item.name} from the list`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:text-ink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
