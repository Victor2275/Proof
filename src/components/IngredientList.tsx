import React from 'react';
import { Recipe } from '../lib/api';
import { CheckCircle2, Sparkles } from 'lucide-react';

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
  handleExportGroceryList
}: IngredientListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg uppercase tracking-wider">Ingredients</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleExportGroceryList}
            className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-border-subtle text-ink-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Copy List
          </button>
          <button 
            onClick={() => setShowBakersMath(!showBakersMath)}
            className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${showBakersMath ? 'bg-accent/10 text-accent border-accent shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border-border-subtle text-ink-muted hover:bg-white/5'}`}
          >
            Baker's %
          </button>
        </div>
      </div>

      <ul className="space-y-0">
        {(() => {
          const flourTotal = (recipe.ingredients || []).reduce((acc, ing) => {
            return (ing.name || '').toLowerCase().includes('flour') ? acc + (ing.quantity || 0) : acc;
          }, 0);

          return (recipe.ingredients || []).map((ing, i) => {
            let pct = '';
            if (showBakersMath && flourTotal > 0) {
              pct = ((ing.quantity / flourTotal) * 100).toFixed(1) + '%';
            }
            
            return (
              <li key={i} className="flex items-start py-3 border-b border-dashed border-border-subtle last:border-0 group">
                <label className="flex items-center p-2 -ml-2 mr-2 cursor-pointer touch-manipulation">
                  <input 
                    type="checkbox" 
                    checked={!!checkedIngredients[i]}
                    onChange={() => toggleCheck(i)}
                    className="w-6 h-6 shrink-0 rounded border-border-subtle text-ink focus:ring-ink cursor-pointer print:appearance-none print:w-5 print:h-5 print:border-2 print:border-ink"
                  />
                </label>
                
                <div className="flex-1 flex flex-wrap sm:flex-nowrap items-baseline gap-x-4 gap-y-1">
                  <span className={`font-medium shrink-0 min-w-[4rem] ${checkedIngredients[i] ? 'text-ink-muted line-through' : ''}`}>
                    {Number((ing.quantity * scaleMultiplier).toFixed(2))} {ing.unit}
                  </span>
                  
                  {showBakersMath && (
                    <span className="text-ink-muted font-mono text-sm shrink-0 min-w-[3rem]">
                      {pct}
                    </span>
                  )}
                  
                  <span className={`flex-1 break-words ${checkedIngredients[i] ? 'text-ink-muted line-through' : ''}`}>
                    {ing.name}
                  </span>
                  
                  {inPantryMap[ing.name] && (
                    <span className="flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" title="In your pantry">
                      <CheckCircle2 className="w-4 h-4 text-green-500/70" />
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setAiSubstituteIngredient(ing.name)}
                  className="ml-2 text-[10px] sm:text-xs text-accent px-2 py-1 rounded border border-accent/20 bg-accent/5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold hover:bg-accent/10 shrink-0 uppercase tracking-widest mt-1 sm:mt-0"
                  title="AI Substitutions"
                >
                  <Sparkles className="w-3 h-3" /> Sub
                </button>
              </li>
            );
          });
        })()}
      </ul>
    </div>
  );
}
