import { useState, useEffect, useMemo } from 'react';
import { api, type Recipe, type PantryItem } from '../lib/api';
import { ShoppingBag, Copy, Download, Share2, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import Fuse from 'fuse.js';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  sourceRecipe?: string;
}

export default function GroceryList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<GroceryItem[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getRecipes().catch(() => []),
      api.getPantry().catch(() => [])
    ]).then(([recData, pantryData]) => {
      setRecipes(recData);
      setPantry(pantryData);
      setLoading(false);
    });
  }, []);

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

    // Append manual items
    manualItems.forEach(item => {
      items.push({
        ...item,
        checked: !!checkedItemIds[item.id]
      });
    });

    return items;
  }, [recipes, pantry, selectedRecipeIds, manualItems, checkedItemIds]);

  const toggleCheckItem = (id: string) => {
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
      quantity: parseFloat(newCustomQty) || 1,
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
      const qtyStr = item.quantity ? `${item.quantity} ${item.unit}`.trim() : '';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-muted">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Grocery Assistant...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase flex items-center gap-3">
            <ShoppingBag className="w-8 h-8" /> Grocery List Generator
          </h1>
          <p className="text-ink-muted mt-2">
            Select recipes to auto-generate missing items against your Smart Pantry stock.
          </p>
        </div>

        {/* Export Toolbar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-lg font-medium hover:opacity-90 transition-opacity text-sm shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy List'}
          </button>

          <button
            onClick={downloadTxt}
            className="flex items-center gap-2 px-4 py-2 border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            <Download className="w-4 h-4" /> Download TXT
          </button>

          <button
            onClick={shareList}
            className="flex items-center gap-2 px-4 py-2 border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {/* Recipe Selector Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider">Select Recipes to Shop For</h2>
        {recipes.length === 0 ? (
          <p className="text-ink-muted italic">No recipes in database yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recipes.map(recipe => {
              const selected = selectedRecipeIds.includes(recipe._id!);
              return (
                <button
                  key={recipe._id}
                  onClick={() => toggleRecipeSelection(recipe._id!)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selected
                      ? 'border-ink bg-black/5 dark:bg-white/10 shadow-sm font-semibold'
                      : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'
                  }`}
                >
                  <span className="truncate pr-2">{recipe.title}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selected ? 'bg-ink border-ink text-paper' : 'border-border-subtle'
                  }`}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Custom Item Input */}
      <form onSubmit={addManualItem} className="bg-sidebar p-4 rounded-xl border border-border-subtle space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Add Extra Item</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Item name (e.g. Parchment Paper)"
            value={newCustomName}
            onChange={e => setNewCustomName(e.target.value)}
            className="flex-1 px-3 py-2 bg-paper border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <input
            type="number"
            step="any"
            placeholder="Qty"
            value={newCustomQty}
            onChange={e => setNewCustomQty(e.target.value)}
            className="w-20 px-3 py-2 bg-paper border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <input
            type="text"
            placeholder="Unit (e.g. rolls)"
            value={newCustomUnit}
            onChange={e => setNewCustomUnit(e.target.value)}
            className="w-28 px-3 py-2 bg-paper border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <button
            type="submit"
            className="bg-ink text-paper px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>

      {/* Generated List Items */}
      <div className="space-y-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Shopping Checklist ({groceryItems.filter(i => !i.checked).length} items remaining)
          </h2>
          {selectedRecipeIds.length > 0 && (
            <span className="text-xs text-ink-muted">
              Auto-filtered against {pantry.length} pantry items
            </span>
          )}
        </div>

        {groceryItems.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-xl text-ink-muted">
            Select one or more recipes above to generate your missing ingredient checklist!
          </div>
        ) : (
          <div className="space-y-2">
            {groceryItems.map(item => (
              <div
                key={item.id}
                onClick={() => toggleCheckItem(item.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  item.checked
                    ? 'bg-black/5 dark:bg-white/5 border-border-subtle/50 opacity-60 line-through'
                    : 'bg-paper border-border-subtle hover:border-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    item.checked ? 'bg-ink border-ink text-paper' : 'border-border-subtle'
                  }`}>
                    {item.checked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="font-semibold text-base">{item.name}</span>
                    {item.quantity ? (
                      <span className="text-ink-muted text-sm ml-2">
                        {item.quantity} {item.unit}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.sourceRecipe && (
                    <span className="text-xs px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-full text-ink-muted font-medium">
                      {item.sourceRecipe}
                    </span>
                  )}
                  {item.id.startsWith('manual-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeManualItem(item.id);
                      }}
                      className="text-red-500 hover:opacity-80 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
