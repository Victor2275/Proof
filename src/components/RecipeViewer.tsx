import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, type Recipe, type BakeLog, type PantryItem } from '../lib/api';
import { getLocalBakeLogs } from '../lib/localDB';
import { Edit, MoreVertical, Play, X, Star, Award, QrCode, Download, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Fuse from 'fuse.js';
import { renderWithTimers } from '../utils/timerParser';

function ExpandableInstruction({ text, index }: { text: string, index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  return (
    <li className="flex gap-4">
      <span className="font-medium text-ink-muted min-w-[20px]">{index + 1}.</span>
      <div className="flex-1">
        <p className={`leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {renderWithTimers(text, `Step ${index + 1}`)}
        </p>
        {!expanded && isLong && (
          <button onClick={() => setExpanded(true)} className="text-ink font-bold text-sm mt-1 underline">Read more</button>
        )}
      </div>
    </li>
  );
}

export default function RecipeViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [bakeLogs, setBakeLogs] = useState<BakeLog[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [inPantryMap, setInPantryMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<'recipe' | 'history'>('recipe');
  const [selectedMake, setSelectedMake] = useState<BakeLog | null>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState('');
  const [showBakersMath, setShowBakersMath] = useState(() => localStorage.getItem('defaultBakersMath') === 'true');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Temporary checkbox state (visual only)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;
      try {
        const [data, cloudLogs, pantryData] = await Promise.all([
          api.getRecipe(id),
          api.getRecipeBakeLogs(id).catch(() => []),
          api.getPantry().catch(() => [])
        ]);
        const localLogs = await getLocalBakeLogs(id);
        const allLogs = [...cloudLogs, ...localLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecipe(data);
        setBakeLogs(allLogs);
        setPantry(pantryData);

        if (pantryData.length > 0 && data.ingredients) {
          const fuse = new Fuse(pantryData, { keys: ['name'], threshold: 0.3 });
          const map: Record<string, boolean> = {};
          data.ingredients.forEach(ing => {
            const matches = fuse.search(ing.name);
            if (matches.length > 0) {
              map[ing.name] = true;
            }
          });
          setInPantryMap(map);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);



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

  const handleExportGroceryList = async () => {
    if (!recipe) return;
    const missingIngredients = recipe.ingredients.filter(ing => !inPantryMap[ing.name]);
    if (missingIngredients.length === 0) {
      alert('You have everything you need in your pantry!');
      return;
    }
    
    const text = `Grocery List for ${recipe.title}:\n\n` + missingIngredients.map(ing => 
      `- [ ] ${Number((ing.quantity * scaleMultiplier).toFixed(2))} ${ing.unit} ${ing.name}`
    ).join('\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grocery List',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Grocery list copied to clipboard!');
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    const isFavorite = recipe.tags?.includes('Favorite');
    const newTags = isFavorite 
      ? recipe.tags.filter(t => t !== 'Favorite')
      : [...(recipe.tags || []), 'Favorite'];
    
    try {
      const updated = await api.updateRecipe(recipe._id!, { tags: newTags });
      setRecipe(updated);
    } catch (err) {
      console.error('Failed to toggle favorite');
    }
  };

  const handleExportImage = async () => {
    const node = document.getElementById('recipe-export-node');
    if (!node) return;
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const url = canvas.toDataURL('image/jpeg', 0.9);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe?.title.replace(/\s+/g, '-').toLowerCase()}-card.jpg`;
      a.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const handleExportPDF = async () => {
    const node = document.getElementById('recipe-export-node');
    if (!node) return;
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If the content is longer than A4, it will just scale down to fit width and run off the page. 
      // For a better PDF, one could paginate, but this is a simple "Recipe Card" export.
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${recipe?.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    }
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  if (loading) return <div className="text-center py-20 text-ink-muted">Loading recipe...</div>;
  if (!recipe) return <div className="text-center py-20 text-ink-muted">Recipe not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start md:items-center gap-4 pb-6">
        <h1 className="text-2xl font-bold tracking-tight uppercase">VIEW RECIPE</h1>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex flex-wrap items-center gap-3 relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> EXPORT
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-paper border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
              <button onClick={handleExportImage} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Export Image Card
              </button>
              <button onClick={handleExportPDF} className="block w-full text-left px-4 py-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Export PDF
              </button>
            </div>
          )}

          <button 
            onClick={() => setShowQrModal(true)}
            className="border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <QrCode className="w-4 h-4" /> QR CODE
          </button>
          <button 
            onClick={handleToggleFavorite}
            className={`border px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${recipe.tags?.includes('Favorite') ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'}`}
          >
            <Star className={`w-4 h-4 ${recipe.tags?.includes('Favorite') ? 'fill-current' : ''}`} /> 
            {recipe.tags?.includes('Favorite') ? 'FAVORITED' : 'FAVORITE'}
          </button>
          <button onClick={handleDelete} className="border border-red-600/30 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">
            Delete
          </button>
          <Link 
            to={`/edit/${recipe._id}`} 
            className="border border-green-600/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Edit className="w-4 h-4" /> EDIT RECIPE
          </Link>
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden relative">
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 -mr-2 text-ink">
            <MoreVertical className="w-6 h-6" />
          </button>
          {showMobileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-paper border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
              <button onClick={handleExportImage} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex justify-between items-center">
                Export Image <Download className="w-4 h-4" />
              </button>
              <button onClick={handleExportPDF} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex justify-between items-center">
                Export PDF <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setShowQrModal(true); setShowMobileMenu(false); }}
                className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle flex justify-between items-center"
              >
                Show QR Code
                <QrCode className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { handleToggleFavorite(); setShowMobileMenu(false); }}
                className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle flex justify-between items-center"
              >
                {recipe.tags?.includes('Favorite') ? 'Remove Favorite' : 'Add Favorite'}
                <Star className={`w-4 h-4 ${recipe.tags?.includes('Favorite') ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </button>
              <Link to={`/edit/${recipe._id}`} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle">
                Edit Recipe
              </Link>
              <button onClick={handleDelete} className="block w-full text-left px-4 py-3 font-medium text-red-600">
                Delete Recipe
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div id="recipe-export-node" className="bg-paper text-ink">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-3 pb-6" data-html2canvas-ignore="true">
            
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
                Previous Makes {bakeLogs.length > 0 ? `(${bakeLogs.length})` : ''}
              </button>
          </div>

          <Link 
            to={`/recipe/${recipe._id}/bake`} 
            className="hidden md:flex bg-ink text-paper px-5 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity uppercase tracking-wide shadow-sm whitespace-nowrap items-center gap-2"
          >
            <Play className="w-4 h-4" fill="currentColor" /> START RECIPE
          </Link>
        </div>



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
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportGroceryList}
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-border-subtle text-ink-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Export List
                  </button>
                  <button 
                    onClick={() => setShowBakersMath(!showBakersMath)}
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border transition-colors ${showBakersMath ? 'bg-ink text-paper border-ink' : 'text-ink-muted border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    Baker's %
                  </button>
                </div>
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
                      <li key={i} className="flex items-start py-3 border-b border-dashed border-border-subtle last:border-0 group">
                        <label className="flex items-center p-2 -ml-2 mr-2 cursor-pointer touch-manipulation">
                          <input 
                            type="checkbox" 
                            checked={!!checkedIngredients[i]}
                            onChange={() => toggleCheck(i)}
                            className="w-5 h-5 rounded border-gray-300 text-ink focus:ring-ink cursor-pointer print:appearance-none print:w-5 print:h-5 print:border-2 print:border-ink"
                          />
                        </label>
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
                        {inPantryMap[ing.name] && (
                          <span className="ml-2 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" title="In your pantry">
                            <CheckCircle2 className="w-4 h-4 text-green-500/70" />
                          </span>
                        )}
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
                  <ExpandableInstruction key={i} text={step} index={i} />
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
          <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-border-subtle pb-4">Previous Makes</h2>
          
          {bakeLogs.length === 0 ? (
             <div className="text-ink-muted text-center py-10">You haven't logged any bakes for this recipe yet.</div>
          ) : (
            bakeLogs.map((log, idx) => (
              <div key={log._id} className="p-6 rounded-xl border border-border-subtle bg-paper shadow-sm cursor-pointer hover:border-ink transition-colors group" onClick={() => { setSelectedMake(log); setIsEditingDate(false); }}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold group-hover:text-ink-muted transition-colors">Make #{bakeLogs.length - idx}</h3>
                    {log.isPersonalBest && <Award className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-sm text-ink-muted">{new Date(log.date || Date.now()).toLocaleDateString()}</p>
                </div>
                {log.notes || (log.imageUrls && log.imageUrls.length > 0) ? (
                   <p className="text-sm font-medium text-ink underline group-hover:no-underline">View Details</p>
                ) : (
                   <p className="text-sm text-ink-muted italic">No details logged</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
      {/* Sticky FAB for Mobile */}
      <Link 
        to={`/recipe/${recipe._id}/bake`} 
        className="md:hidden fixed bottom-24 right-4 bg-ink text-paper w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
      >
        <Play className="w-6 h-6 ml-1" fill="currentColor" />
      </Link>

      {/* Make Details Full Screen Modal */}
      {selectedMake && (
        <div className="fixed inset-0 z-[100] bg-paper overflow-y-auto animate-in slide-in-from-bottom-5">
           <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-border-subtle">
               <div>
                 <h2 className="text-3xl font-bold uppercase tracking-tight">Make #{bakeLogs.findIndex(l => l._id === selectedMake._id) !== -1 ? bakeLogs.length - bakeLogs.findIndex(l => l._id === selectedMake._id) : ''}</h2>
                 {isEditingDate ? (
                   <div className="flex items-center gap-2 mt-2">
                     <input 
                       type="datetime-local" 
                       value={editDateValue} 
                       onChange={e => setEditDateValue(e.target.value)} 
                       className="border border-border-subtle rounded px-2 py-1.5 bg-black/5 dark:bg-white/5 text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                     />
                     <button 
                       onClick={async () => {
                         try {
                           let updated;
                           if (selectedMake._id!.startsWith('local-')) {
                             const { updateLocalBakeLog } = await import('../lib/localDB');
                             updated = await updateLocalBakeLog(selectedMake._id!, { date: new Date(editDateValue).toISOString() });
                           } else {
                             updated = await api.updateBakeLog(selectedMake._id!, { date: new Date(editDateValue).toISOString() });
                           }
                           setSelectedMake(updated);
                           setBakeLogs(prev => prev.map(l => l._id === updated._id ? updated : l));
                           setIsEditingDate(false);
                         } catch(e) { alert('Failed to update date'); }
                       }}
                       className="bg-ink text-paper px-4 py-1.5 rounded-md text-sm font-bold hover:opacity-90"
                     >Save</button>
                     <button onClick={() => setIsEditingDate(false)} className="text-sm font-medium hover:underline text-ink-muted hover:text-ink px-2">Cancel</button>
                   </div>
                 ) : (
                   <div>
                     <p className="text-ink-muted text-lg">{new Date(selectedMake.date || Date.now()).toLocaleString()}</p>
                     <div className="flex flex-wrap items-center gap-4 mt-2">
                     <button 
                       onClick={() => setIsEditingDate(true)}
                       className="text-sm font-bold text-ink-muted uppercase tracking-widest hover:text-ink flex items-center gap-2"
                     >
                       <Edit className="w-4 h-4" /> Edit Date
                     </button>
                     
                     <button 
                       onClick={async () => {
                         try {
                           let updated;
                           if (selectedMake._id!.startsWith('local-')) {
                             const { updateLocalBakeLog } = await import('../lib/localDB');
                             updated = await updateLocalBakeLog(selectedMake._id!, { isPersonalBest: !selectedMake.isPersonalBest });
                           } else {
                             updated = await api.updateBakeLog(selectedMake._id!, { isPersonalBest: !selectedMake.isPersonalBest });
                           }
                           setSelectedMake(updated);
                           setBakeLogs(prev => prev.map(l => l._id === updated._id ? updated : l));
                         } catch(e) { alert('Failed to update personal best'); }
                       }}
                       className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${selectedMake.isPersonalBest ? 'text-yellow-600 dark:text-yellow-400' : 'text-ink-muted hover:text-ink'}`}
                     >
                       <Award className={`w-4 h-4 ${selectedMake.isPersonalBest ? 'fill-current' : ''}`} /> 
                       {selectedMake.isPersonalBest ? 'Personal Best' : 'Mark as Best'}
                     </button>
                   </div>
                 </div>
                 )}
               </div>
               <button onClick={() => setSelectedMake(null)} className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-8">

                 {selectedMake.notes && (
                   <div>
                     <h3 className="font-bold text-xl mb-4 uppercase tracking-wider border-l-4 border-ink pl-3">Bake Notes</h3>
                     <div className="p-6 border border-border-subtle rounded-2xl bg-black/5 dark:bg-white/5 shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed text-lg">{selectedMake.notes}</p>
                     </div>
                   </div>
                 )}
               </div>
               
               {selectedMake.imageUrls && selectedMake.imageUrls.length > 0 && (
                 <div>
                   <h3 className="font-bold text-xl mb-4 uppercase tracking-wider border-l-4 border-ink pl-3">Photos</h3>
                   <div className="grid grid-cols-1 gap-6">
                     {selectedMake.imageUrls.map((url, i) => (
                       <img key={i} src={url} alt={`Make photo ${i+1}`} className="w-full rounded-2xl border border-border-subtle shadow-md" />
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}

      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper p-8 rounded-2xl shadow-2xl relative max-w-sm w-full text-center animate-in zoom-in-95">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold uppercase tracking-tight mb-6">{recipe.title}</h3>
            <div className="bg-white p-4 rounded-xl inline-block shadow-sm border border-border-subtle">
              <QRCodeSVG value={window.location.href} size={200} level="M" />
            </div>
            <p className="mt-6 text-sm text-ink-muted font-medium">Scan to open on your mobile device</p>
          </div>
        </div>
      )}
    </div>
  );
}
