import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Recipe, type Component } from '../lib/api';
import { X, ChevronLeft, ChevronRight, Check, Upload, Loader2, List } from 'lucide-react';
import { renderWithTimers } from '../utils/timerParser';

export default function BakingMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const wakeLock = useRef<any>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Finish Modal State
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (id) {
      api.getRecipe(id)
        .then(setRecipe)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.log('Wake Lock error:', err.name, err.message);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFinishModal) return;
      if (e.key === 'Escape') navigate(`/recipe/${id}`);
      
      if (viewMode === 'focus') {
        if (e.key === 'ArrowRight' && recipe && currentStep < recipe.instructions.length) {
          setCurrentStep(prev => prev + 1);
        }
        if (e.key === 'ArrowLeft' && currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, recipe, navigate, id, showFinishModal, viewMode]);

  const getSmartIngredients = (stepText: string): Component[] => {
    if (!recipe) return [];
    const textLower = stepText.toLowerCase();
    return recipe.ingredients.filter(ing => {
      const ingNameLower = ing.name.toLowerCase();
      // split ingredient name into words to check if any significant word is in the text
      const words = ingNameLower.split(' ').filter(w => w.length > 2);
      return words.some(w => textLower.includes(w));
    });
  };

  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLog(true);
    try {
      let imageUrls: string[] = [];
      if (imageFile) {
        const uploadRes = await api.uploadImage(imageFile);
        imageUrls.push(uploadRes.imageUrl);
      }

      await fetch('http://localhost:3001/api/bakelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: id,
          temperature: temp,
          humidity,
          notes,
          imageUrls
        })
      });

      // Navigate back to the recipe page
      navigate(`/recipe/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save bake log');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <div className="fixed inset-0 z-50 bg-paper flex items-center justify-center">Loading...</div>;
  if (!recipe) return <div className="fixed inset-0 z-50 bg-paper flex items-center justify-center">Recipe not found.</div>;

  const isFinished = currentStep === recipe.instructions.length;
  const progress = (currentStep / recipe.instructions.length) * 100;
  
  const stepText = isFinished ? "You're done!" : recipe.instructions[currentStep];
  const smartIngredients = isFinished ? [] : getSmartIngredients(stepText);

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-black/5 dark:bg-white/5 relative">
        <div className="absolute top-0 left-0 h-full bg-ink transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      
      {/* Top Header */}
      <div className="w-full px-6 py-4 flex justify-between items-center max-w-5xl shrink-0">
        <button onClick={() => setShowIngredients(!showIngredients)} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2">
          <List className="w-6 h-6" /> <span className="font-medium hidden sm:inline">Ingredients</span>
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode(prev => prev === 'focus' ? 'all' : 'focus')}
            className="px-4 py-1.5 rounded-full border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wide"
          >
            {viewMode === 'focus' ? 'Show All Steps' : 'Focus Mode'}
          </button>
          <span className="font-bold text-ink-muted uppercase tracking-wider text-sm hidden sm:inline">
            {viewMode === 'all' ? 'All Steps' : (isFinished ? 'Finished' : `Step ${currentStep + 1} of ${recipe.instructions.length}`)}
          </span>
        </div>

        <button onClick={() => navigate(`/recipe/${id}`)} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-8 md:px-12 pb-20 relative overflow-y-auto">
        {viewMode === 'focus' ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center">
            <div className="text-3xl md:text-5xl font-medium leading-relaxed md:leading-normal text-center transition-all duration-300">
              {isFinished ? stepText : renderWithTimers(stepText, `Step ${currentStep + 1}`)}
            </div>

            {!isFinished && smartIngredients.length > 0 && (
              <div className="mt-12 bg-black/5 dark:bg-white/5 p-6 rounded-xl border border-border-subtle w-full max-w-2xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4 border-b border-border-subtle pb-2">Matched Ingredients</h4>
                <ul className="space-y-3">
                  {smartIngredients.map((ing, idx) => (
                    <li key={idx} className="flex justify-between font-mono text-sm md:text-base">
                      <span>{ing.name}</span>
                      <span className="font-bold">{ing.quantity} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isFinished && (
              <button onClick={() => setShowFinishModal(true)} className="mt-12 bg-ink text-paper px-10 py-4 rounded-xl font-bold text-xl hover:opacity-90 transition-opacity shadow-lg flex items-center gap-3">
                <Check className="w-6 h-6" /> Finish Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="w-full py-8 space-y-12">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex gap-6">
                <span className="text-3xl font-black text-ink-muted/30">{idx + 1}.</span>
                <div className="text-2xl md:text-3xl font-medium leading-relaxed">{renderWithTimers(step, `Step ${idx+1}`)}</div>
              </div>
            ))}
            
            <div className="pt-12 border-t border-border-subtle flex justify-center">
              <button onClick={() => setShowFinishModal(true)} className="bg-ink text-paper px-10 py-4 rounded-xl font-bold text-xl hover:opacity-90 transition-opacity shadow-lg flex items-center gap-3">
                <Check className="w-6 h-6" /> Finish Recipe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Arrows (Only in Focus Mode) */}
      {viewMode === 'focus' && (
        <>
          <button 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-0 transition-all"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => setCurrentStep(prev => Math.min(recipe.instructions.length, prev + 1))}
            disabled={currentStep === recipe.instructions.length}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-0 transition-all"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Ingredients Sidebar Overlay */}
      {showIngredients && (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-paper border-r border-border-subtle shadow-2xl z-20 flex flex-col animate-in slide-in-from-left">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-black/5 dark:bg-white/5">
            <h2 className="font-bold uppercase tracking-wider">All Ingredients</h2>
            <button onClick={() => setShowIngredients(false)}><X className="w-5 h-5 text-ink-muted hover:text-ink" /></button>
          </div>
          <ul className="flex-1 overflow-y-auto p-6 space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={!!checkedIngredients[i]}
                  onChange={() => setCheckedIngredients(prev => ({...prev, [i]: !prev[i]}))}
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                />
                <div className={`flex flex-col ${checkedIngredients[i] ? 'opacity-50 line-through' : ''}`}>
                  <span className="font-bold">{ing.quantity} {ing.unit}</span>
                  <span className="text-sm">{ing.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl w-full max-w-xl shadow-2xl border border-border-subtle flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-2xl font-bold">Log Bake</h2>
              <button onClick={() => setShowFinishModal(false)}><X className="w-6 h-6 hover:opacity-70" /></button>
            </div>
            
            <form onSubmit={handleFinishSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Kitchen Temp</label>
                  <input type="text" value={temp} onChange={e => setTemp(e.target.value)} className="w-full border border-border-subtle rounded-md p-3 bg-black/5 dark:bg-white/5 focus:ring-1 focus:ring-ink focus:outline-none" placeholder="e.g. 72°F" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Humidity</label>
                  <input type="text" value={humidity} onChange={e => setHumidity(e.target.value)} className="w-full border border-border-subtle rounded-md p-3 bg-black/5 dark:bg-white/5 focus:ring-1 focus:ring-ink focus:outline-none" placeholder="e.g. 45%" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Bake Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full border border-border-subtle rounded-md p-3 bg-black/5 dark:bg-white/5 focus:ring-1 focus:ring-ink focus:outline-none resize-none" placeholder="How did it turn out? What would you change next time?"></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Photo</label>
                <div className="border-2 border-dashed border-border-subtle rounded-lg p-8 flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer relative">
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-8 h-8 text-ink-muted mb-2" />
                  <span className="text-sm font-medium text-ink-muted">
                    {imageFile ? imageFile.name : 'Upload Photo'}
                  </span>
                </div>
              </div>

              <button type="submit" disabled={savingLog} className="w-full bg-ink text-paper font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {savingLog ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Log & Finish'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
