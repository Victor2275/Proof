import { useEffect, useState } from 'react';
import { Plus, ScanBarcode, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { PantryItem } from '../lib/types';
import { useAddPantryItem, useDeletePantryItem, usePantry, useRestoreRecord } from '../lib/queries';
import { haptic } from '../lib/haptics';
import { useUndoableAction } from '../lib/useUndoableAction';
import { Button, Field, IconButton, Sheet } from './ui';

/*
 * In the cupboard (change 122): what is already in the kitchen, as a shelf of
 * chips rather than a stock ledger. It is read everywhere else — a recipe's
 * "have it" mark, "Add missing to Shop", the cookbook's "Can make" filter — so
 * the page itself only needs to say what it is for, take a name or a barcode,
 * and let a thing be taken off with Undo.
 */

const EMPTY: PantryItem[] = [];

export default function Cupboard() {
  const pantry = usePantry();
  const add = useAddPantryItem();
  const remove = useDeletePantryItem();
  const restore = useRestoreRecord();
  const undoable = useUndoableAction();
  const items = pantry.data ?? EMPTY;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 150 } }, false);
    scanner.render(
      async (decodedText) => {
        scanner.clear();
        setScanning(false);
        try {
          const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
          const data = await res.json();
          if (data.status === 1 && data.product?.product_name) setName(data.product.product_name);
          else setError("That barcode isn't in the Open Food Facts database. Type the name instead.");
        } catch {
          setError("Couldn't look up that barcode: the product database needs a connection. Type the name instead.");
        }
      },
      () => undefined,
    );
    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [scanning]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (items.some((i) => i.name.toLowerCase() === value.toLowerCase())) {
      setError(`${value} is already in the cupboard.`);
      return;
    }
    try {
      setError('');
      await add.mutateAsync(value);
      haptic('light');
      setName('');
    } catch {
      setError("Couldn't add that to the cupboard on this device. Try again.");
    }
  };

  const takeOut = (item: PantryItem) =>
    void undoable({
      message: `${item.name} taken out of the cupboard`,
      run: () => remove.mutateAsync(item._id),
      undo: () => restore.mutateAsync({ store: 'pantry', id: item._id }),
    });

  return (
    <div className="flex flex-col gap-6 pb-20">
      <p className="max-w-prose text-ink-2">Mark what's in your kitchen; recipes will tell you what's missing.</p>

      <form onSubmit={addItem} className="flex items-end gap-2">
        <Field
          label="Add to the cupboard"
          hideLabel
          className="min-w-0 flex-1"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="Bread flour, yeast…"
          error={error || undefined}
        />
        <Button type="submit" disabled={!name.trim()} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add
        </Button>
        <IconButton label="Scan a barcode" icon={<ScanBarcode className="h-5 w-5" aria-hidden="true" />} onClick={() => setScanning(true)} />
      </form>

      {/* Mounted only while scanning, so #reader exists when the effect hands it to the scanner. */}
      {scanning ? (
        <Sheet open onClose={() => setScanning(false)} title="Scan a barcode" size="md">
          <div id="reader" className="w-full overflow-hidden rounded-key bg-paper-sunk" />
        </Sheet>
      ) : null}

      {pantry.isPending ? null : pantry.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-ink">Couldn't read the cupboard on this device.</p>
          <Button onClick={() => pantry.refetch()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-ink-muted">Nothing marked yet. Start with what you always keep: flour, salt, sugar, butter.</p>
      ) : (
        <section aria-labelledby="cupboard-heading" className="flex flex-col gap-2">
          <h2 id="cupboard-heading" className="ui-label text-ink-2">
            {items.length} in the cupboard
          </h2>
          <ul className="flex flex-wrap gap-2">
            {[...items]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <li key={item._id} className="flex items-center rounded-full bg-paper-tonal pl-3.5 text-ink">
                  <span className="font-prose">{item.name}</span>
                  <IconButton
                    label={`Take ${item.name} out of the cupboard`}
                    icon={<X className="h-4 w-4" aria-hidden="true" />}
                    className="text-ink-muted"
                    onClick={() => takeOut(item)}
                  />
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
