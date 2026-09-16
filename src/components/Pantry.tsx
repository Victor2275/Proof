import { useState, useEffect } from 'react';
import { api, type PantryItem } from '../lib/api';
import { Plus, X, ScanBarcode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button, Field, Panel, Skeleton } from './ui';

/*
 * The pantry — the machine's own inventory panel.
 *
 * Everything listed here is in stock, so every lamp is lit. That is not
 * decoration: a bank of lit lamps is what a full inventory looks like, and it
 * is the same lamp a recipe's ingredient list uses to say "you have this."
 * Learning it once here means reading it everywhere else.
 *
 * Two columns on a desktop and hairline rules rather than a chip per item: a
 * pantry is a printed list, and forty bordered pills read as forty objects
 * instead of one list.
 */

export default function Pantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchPantry();
  }, []);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );
      scanner.render(async (decodedText) => {
        scanner.clear();
        setScanning(false);
        try {
          const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
          const data = await res.json();
          if (data.status === 1 && data.product?.product_name) {
            setNewItemName(data.product.product_name);
          } else {
            setError('Product not found in barcode database.');
          }
        } catch (err) {
          setError('Failed to fetch product data.');
        }
      }, () => {
        // Ignored
      });
      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [scanning]);

  const fetchPantry = async () => {
    try {
      setLoading(true);
      const data = await api.getPantry();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      setError('');
      const newItem = await api.addPantryItem({ name: newItemName.trim() });
      setItems([newItem, ...items]);
      setNewItemName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add item. Admin required.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.deletePantryItem(id);
      setItems(items.filter(item => item._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete item. Admin required.');
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-faceplate text-3xl leading-none text-ink sm:text-4xl">Pantry</h1>
          <p className="max-w-prose text-ink-muted">
            What you have in stock. Recipes cross-reference it by fuzzy match, so a lamp lights
            beside every ingredient you already own.
          </p>
        </div>
        {!loading && (
          <span className="label-silkscreen shrink-0 text-silkscreen">
            {items.length} {items.length === 1 ? 'item' : 'items'} in stock
          </span>
        )}
      </header>

      <Panel title="Add to stock">
        <form onSubmit={handleAddItem} className="flex flex-wrap items-end gap-3">
          <Field
            label="Ingredient"
            hideLabel
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Bread flour, active dry yeast…"
            className="min-w-0 flex-1 basis-full sm:basis-56"
          />
          {/* Not the signal colour: the shell's New Recipe control already owns
            * the one solid red on this screen, and adding flour to a cupboard is
            * not the thing happening now. */}
          <Button type="submit" icon={<Plus className="h-4 w-4" />}>
            Add
          </Button>
          <Button
            onClick={() => setScanning(true)}
            aria-label="Scan barcode"
            icon={<ScanBarcode className="h-4 w-4" />}
          />
        </form>
        {error && <p className="mt-3 text-sm text-signal">{error}</p>}
      </Panel>

      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="scrim absolute inset-0" onClick={() => setScanning(false)} aria-hidden="true" />
          <div className="relative w-full max-w-lg rounded-panel border border-rule bg-panel faceplate">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <h2 className="label-silkscreen">Scan barcode</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScanning(false)}
                aria-label="Close scanner"
                icon={<X className="h-4 w-4" />}
              />
            </div>
            <div className="p-4">
              <div id="reader" className="w-full overflow-hidden rounded-key bg-panel-sunk" />
            </div>
          </div>
        </div>
      )}

      <Panel title="In stock" flush>
        {loading ? (
          <div className="flex flex-col gap-3 p-4" aria-label="Loading pantry">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-48" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-4">
            {/* A dark lamp is a designed state, not an error. */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 border border-key-unlit" aria-hidden="true" />
              <span className="label-silkscreen text-silkscreen">Nothing in stock</span>
            </div>
            <p className="max-w-prose text-ink-muted">
              Add what you keep on hand and every recipe will tell you what you are missing.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item._id}
                className="flex min-h-11 items-center gap-3 border-b border-rule px-4 py-2 last:border-b-0 sm:odd:border-r"
              >
                {/* Lit, filled, bone — the same lamp a recipe uses for
                  * "the pantry has this". Having flour is not an event, so it
                  * is never the signal colour. */}
                <span className="h-2 w-2 shrink-0 bg-ink" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
                <span className="sr-only">in stock</span>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item._id!)}
                  aria-label={`Remove ${item.name} from the pantry`}
                  className="shrink-0 rounded-control p-2 text-ink-muted transition-colors hover:text-signal"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
