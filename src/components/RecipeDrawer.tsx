import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type Recipe } from '../lib/api';
import { X, Check } from 'lucide-react';

interface RecipeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
}

export default function RecipeDrawer({ isOpen, onClose, recipeId }: RecipeDrawerProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && recipeId) {
      setLoading(true);
      api.getRecipe(recipeId)
        .then(setRecipe)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, recipeId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            data-testid="recipe-drawer-backdrop"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[101] h-[85vh] bg-paper rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-border-subtle"
            data-testid="recipe-drawer-content"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-black/5 dark:bg-white/5">
              <h2 className="text-2xl font-bold truncate pr-4 text-ink">
                {loading ? 'Loading...' : recipe?.title || 'Sub-Recipe'}
              </h2>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-ink transition-colors"
                aria-label="Close Drawer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-12"><span className="animate-pulse font-bold text-ink-muted">Loading sub-recipe...</span></div>
              ) : recipe ? (
                <div className="space-y-8 pb-24">
                  {/* Ingredients */}
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink-muted mb-4 border-b border-border-subtle pb-2">Ingredients</h3>
                    <ul className="space-y-3">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex justify-between font-mono border-b border-black/5 dark:border-white/5 pb-2">
                          <span className="text-ink">{ing.name}</span>
                          <span className="font-bold text-ink">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Instructions */}
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink-muted mb-4 border-b border-border-subtle pb-2">Instructions</h3>
                    <div className="space-y-6">
                      {recipe.instructions.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <span className="font-black text-ink-muted/30 text-xl">{idx + 1}.</span>
                          <div className="text-lg leading-relaxed text-ink">{step}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="text-red-500 font-bold">Failed to load sub-recipe.</div>
              )}
            </div>

            {/* Footer */}
            {!loading && recipe && (
              <div className="p-4 bg-paper border-t border-border-subtle">
                <button
                  onClick={onClose}
                  className="w-full bg-ink text-paper font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
                >
                  <Check className="w-5 h-5" /> Finish {recipe.title}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
