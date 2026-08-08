import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, type Recipe } from '../lib/api';
import { Edit } from 'lucide-react';
import { renderWithTimers } from '../utils/timerParser';

export default function RecipeViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<'recipe' | 'history'>('recipe');
  const [versions, setVersions] = useState<Recipe[]>([]);
  const [showBakersMath, setShowBakersMath] = useState(false);

  // Temporary checkbox state (visual only)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (id) {
      api.getRecipe(id).then(data => {
        setRecipe(data);
        setLoading(false);
        // Fetch versions history
        api.getRecipeVersions(id).then(setVersions).catch(console.error);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [id]);

  const handleRestoreVersion = async (versionId: string) => {
    if (!window.confirm("Restore this version to be the latest?")) return;
    try {
      // Actually, restoring means making this version the latest.
      // Easiest way: copy this version's data and POST it as a new iteration.
      const versionToRestore = versions.find(v => v._id === versionId);
      if (!versionToRestore) return;
      
      const { _id, createdAt, updatedAt, parentRecipeId, versionNumber, isLatestVersion, commitMessage, ...rest } = versionToRestore as any;
      const newRecipe = await api.createRecipeVersion(id!, { ...rest, commitMessage: `Restored from V${versionNumber}` });
      navigate(`/recipe/${newRecipe._id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to restore version');
    }
  };

  const toggleCheck = (index: number) => {
    setCheckedIngredients(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
      try {
        await api.deleteRecipe(id);
        navigate('/');
      } catch (err) {
        console.error(err);
        alert('Failed to delete recipe');
      }
    }
  };

  if (loading) return <div className="text-center py-20 text-ink-muted">Loading recipe...</div>;
  if (!recipe) return <div className="text-center py-20 text-ink-muted">Recipe not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      
      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-6">
        <h1 className="text-2xl font-bold tracking-tight uppercase whitespace-nowrap">VIEW RECIPE</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleDelete} className="border border-red-600/30 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">
            Delete
          </button>
          <Link 
            to={`/recipe/${recipe._id}/edit`} 
            className="border border-green-600/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Edit className="w-4 h-4" /> EDIT RECIPE
          </Link>
          
          <div className="flex border border-border-subtle rounded-md overflow-hidden bg-black/5 dark:bg-white/5 p-0.5 text-xs font-medium uppercase tracking-wide">
             {[0.5, 1, 2, 3].map(m => (
               <button 
                 key={m}
                 onClick={() => setScaleMultiplier(m)}
                 className={`px-3 py-1 rounded transition-all ${scaleMultiplier === m ? 'bg-paper shadow-sm text-ink' : 'text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'}`}
               >
                 {m}x
               </button>
             ))}
          </div>

          <div className="flex border border-border-subtle rounded-md overflow-hidden bg-black/5 dark:bg-white/5 p-0.5 text-xs font-medium uppercase tracking-wide whitespace-nowrap">
             <button 
               onClick={() => setActiveTab('recipe')}
               className={`px-3 py-1 rounded transition-all ${activeTab === 'recipe' ? 'bg-paper shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
             >
               Recipe
             </button>
             <button 
               onClick={() => setActiveTab('history')}
               className={`px-3 py-1 rounded transition-all ${activeTab === 'history' ? 'bg-paper shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
             >
               History {versions.length > 1 ? `(${versions.length})` : ''}
             </button>
          </div>

          <Link 
            to={`/bake/${recipe._id}`} 
            className="bg-ink text-paper px-5 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity uppercase tracking-wide shadow-sm whitespace-nowrap"
          >
            START RECIPE
          </Link>
        </div>
      </div>

      {recipe.isLatestVersion === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-800 dark:text-yellow-400 p-4 rounded-xl flex items-center justify-between mb-8 shadow-sm">
          <div>
            <span className="font-bold">Note:</span> You are viewing an older iteration (V{recipe.versionNumber}).
          </div>
          {versions.length > 0 && versions[0]._id !== recipe._id && (
             <Link to={`/recipe/${versions[0]._id}`} className="font-bold underline hover:no-underline">Go to Latest</Link>
          )}
        </div>
      )}

      {activeTab === 'recipe' ? (
        <>
          {/* Main Info */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {recipe.imageUrls && recipe.imageUrls.length > 0 ? (
              <div className="w-full md:w-1/3 space-y-4">
                {recipe.imageUrls.map((url, idx) => (
                  <img key={idx} src={url} alt={`${recipe.title} ${idx + 1}`} className="w-full rounded-xl object-cover shadow-sm aspect-[4/3]" />
                ))}
              </div>
            ) : (
              <div className="w-full md:w-1/3 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center aspect-[4/3] text-ink-muted">
                No Images
              </div>
            )}

            <div className="flex-1 space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">{recipe.title}</h2>

              <p className="text-lg text-ink-muted leading-relaxed">
                {recipe.description}
              </p>

              <div className="flex gap-10 pt-4">
                <div>
                  <div className="font-bold mb-1">Total Time:</div>
                  <div className="text-ink-muted">
                    [{parseInt(recipe.prepTime) + parseInt(recipe.cookTime) || 90} mins] (Prep: {recipe.prepTime || '-'} / Cook: {recipe.cookTime || '-'})
                  </div>
                </div>
                <div>
                  <div className="font-bold mb-1">Servings:</div>
                  <div className="text-ink-muted">[{recipe.servings ? recipe.servings * scaleMultiplier : 4 * scaleMultiplier}]</div>
                </div>
                <div>
                  <div className="font-bold mb-1">Difficulty:</div>
                  <div className="text-ink-muted">[{recipe.difficulty || 'Medium'}]</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients and Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg uppercase tracking-wider">Ingredients</h3>
                <button 
                  onClick={() => setShowBakersMath(!showBakersMath)}
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border transition-colors ${showBakersMath ? 'bg-ink text-paper border-ink' : 'text-ink-muted border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  Baker's %
                </button>
              </div>
              
              <ul className="space-y-0">
                {(() => {
                  const flourTotal = recipe.ingredients.reduce((acc, ing) => {
                    return ing.name.toLowerCase().includes('flour') ? acc + ing.quantity : acc;
                  }, 0);

                  return recipe.ingredients.map((ing, i) => {
                    let pct = '';
                    if (showBakersMath && flourTotal > 0) {
                      pct = ((ing.quantity / flourTotal) * 100).toFixed(1) + '%';
                    }
                    
                    return (
                      <li key={i} className="flex items-center py-3 border-b border-dashed border-border-subtle last:border-0 group">
                        <input 
                          type="checkbox" 
                          checked={!!checkedIngredients[i]}
                          onChange={() => toggleCheck(i)}
                          className="w-4 h-4 mr-4 rounded border-gray-300 text-ink focus:ring-ink cursor-pointer print:appearance-none print:w-5 print:h-5 print:border-2 print:border-ink"
                        />
                        <span className={`w-16 font-medium shrink-0 ${checkedIngredients[i] ? 'text-ink-muted line-through' : ''}`}>
                          {Number((ing.quantity * scaleMultiplier).toFixed(2))} {ing.unit}
                        </span>
                        {showBakersMath && (
                          <span className="w-16 text-ink-muted font-mono text-sm shrink-0">
                            {pct}
                          </span>
                        )}
                        <span className={checkedIngredients[i] ? 'text-ink-muted line-through' : ''}>
                          {ing.name}
                        </span>
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-6 uppercase tracking-wider">Steps / Directions</h3>
              <ol className="space-y-6">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-medium text-ink-muted min-w-[20px]">{i + 1}.</span>
                    <p className="leading-relaxed">{renderWithTimers(step, `Step ${i+1}`)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Lab Notes */}
          {recipe.labNotes && (
            <div className="pt-10">
              <h3 className="font-bold text-lg mb-4 uppercase tracking-wider">Lab Notes & Iterations</h3>
              <div className="bg-black/5 dark:bg-white/5 border border-border-subtle rounded-lg p-6 relative">
                <div className="absolute top-2 right-4 text-xs text-ink-muted">markdown</div>
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink-muted">
                  {recipe.labNotes}
                </pre>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-border-subtle pb-4">Version History</h2>
          
          {versions.map((v, idx) => (
            <div key={v._id} className={`p-6 rounded-xl border ${v._id === recipe._id ? 'border-ink shadow-md' : 'border-border-subtle'} bg-paper relative`}>
              {v._id === recipe._id && <div className="absolute top-0 right-0 bg-ink text-paper text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase">Currently Viewing</div>}
              {v.isLatestVersion && v._id !== recipe._id && <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase">Latest Version</div>}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">Version {v.versionNumber}</h3>
                  <p className="text-sm text-ink-muted">{new Date(v.createdAt!).toLocaleString()}</p>
                </div>
                {v._id !== recipe._id && (
                  <div className="flex gap-2">
                    <Link to={`/recipe/${v._id}`} className="px-4 py-2 border border-border-subtle rounded-md text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      View Version
                    </Link>
                    {!v.isLatestVersion && (
                      <button onClick={() => handleRestoreVersion(v._id!)} className="px-4 py-2 bg-ink text-paper rounded-md text-sm font-bold hover:opacity-90 transition-opacity">
                        Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {v.commitMessage && (
                <div className="mb-4 p-3 bg-black/5 dark:bg-white/5 rounded-md border-l-4 border-ink">
                  <span className="font-bold text-sm uppercase text-ink-muted">Commit Message:</span>
                  <p className="font-medium mt-1">{v.commitMessage}</p>
                </div>
              )}

              {/* Show Diff compared to previous version if this isn't the first version */}
              {idx < versions.length - 1 && (
                <div className="mt-4 border-t border-border-subtle pt-4">
                  <h4 className="text-sm font-bold uppercase text-ink-muted mb-2">Changes from V{versions[idx+1].versionNumber}</h4>
                  <ul className="space-y-1 text-sm font-mono">
                    {/* Very simple visual diff of ingredients */}
                    {v.ingredients.map(ing => {
                      const oldIng = versions[idx+1].ingredients.find(o => o.name.toLowerCase() === ing.name.toLowerCase());
                      if (!oldIng) return <li key={ing.name} className="text-green-600 dark:text-green-400">+ Added: {ing.quantity} {ing.unit} {ing.name}</li>;
                      if (oldIng.quantity !== ing.quantity || oldIng.unit !== ing.unit) {
                        return <li key={ing.name} className="text-blue-600 dark:text-blue-400">~ Changed: {ing.name} from {oldIng.quantity}{oldIng.unit} to {ing.quantity}{ing.unit}</li>;
                      }
                      return null;
                    })}
                    {versions[idx+1].ingredients.map(oldIng => {
                      const stillExists = v.ingredients.find(i => i.name.toLowerCase() === oldIng.name.toLowerCase());
                      if (!stillExists) return <li key={oldIng.name} className="text-red-600 dark:text-red-400">- Removed: {oldIng.name}</li>;
                      return null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
