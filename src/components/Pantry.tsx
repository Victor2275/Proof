import { useState, useEffect } from 'react';
import { api, type PantryItem } from '../lib/api';
import { Box, Plus, X, ScanBarcode } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
      }, (err) => {
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

  if (loading) return <div className="text-center py-20 text-ink-muted">Loading pantry...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 border-b border-border-subtle pb-6">
        <Box className="w-8 h-8" />
        <h1 className="text-3xl font-bold tracking-tight uppercase">Smart Pantry</h1>
      </div>

      <div className="bg-sidebar p-6 rounded-2xl border border-border-subtle shadow-sm">
        <p className="text-ink-muted mb-6 font-medium">Add ingredients you currently have in stock. When viewing recipes, your pantry will automatically cross-reference what you need via fuzzy matching.</p>
        
        <form onSubmit={handleAddItem} className="flex gap-4">
          <input 
            type="text" 
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Bread Flour, active dry yeast..." 
            className="flex-1 bg-paper border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-ink transition-colors"
          />
          <button type="submit" className="bg-ink text-paper px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-5 h-5" /> Add
          </button>
          <button 
            type="button" 
            onClick={() => setScanning(true)}
            className="border border-border-subtle px-4 py-3 rounded-xl text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <ScanBarcode className="w-5 h-5" />
          </button>
        </form>
        {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
      </div>

      {scanning && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-paper p-6 rounded-2xl max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold uppercase">Scan Barcode</h3>
              <button onClick={() => setScanning(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div id="reader" className="w-full bg-black/5 rounded-xl overflow-hidden"></div>
          </div>
        </div>
      )}

      <div className="bg-paper p-6 rounded-2xl border border-border-subtle shadow-sm min-h-[300px]">
        {items.length === 0 ? (
          <div className="text-center text-ink-muted py-20 border-2 border-dashed border-border-subtle rounded-xl bg-black/5 dark:bg-white/5">
            Your pantry is empty.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {items.map(item => (
              <div key={item._id} className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-border-subtle pl-4 pr-2 py-2 rounded-lg font-medium shadow-sm group">
                <span>{item.name}</span>
                <button 
                  onClick={() => handleDeleteItem(item._id!)}
                  className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors text-ink-muted group-hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
