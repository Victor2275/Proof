import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, type Recipe, type BakeLog } from '../lib/api';
import { getLocalBakeLogs } from '../lib/localDB';
import SideBySideCompare from './SideBySideCompare';
import ReverseBakeScheduler from './ReverseBakeScheduler';
import AISubstitutionsModal from './AISubstitutionsModal';
import InstagramExporter from './InstagramExporter';
import BakeLogsGrid from './BakeLogsGrid';
import { Edit, MoreVertical, Play, X, Star, Award, CheckCircle2, Sparkles, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Fuse from 'fuse.js';
import { renderWithTimers } from '../utils/timerParser';

function Instagram({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function ExpandableInstruction({ text = '', index }: { text: string, index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (text || '').length > 150;

  return (
    <li className="flex gap-4">
      <span className="font-medium text-ink-muted min-w-[20px]">{index + 1}.</span>
      <div className="flex-1">
        <p className={`leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {renderWithTimers(text || '', `Step ${index + 1}`)}
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
  const location = useLocation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [bakeLogs, setBakeLogs] = useState<BakeLog[]>([]);
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
  const [showReverseScheduler, setShowReverseScheduler] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [showMobileStartModal, setShowMobileStartModal] = useState(false);
  const [showMobileShareModal, setShowMobileShareModal] = useState(false);
  const [heroImage, setHeroImage] = useState<string>('');
  const [showInstagramExporter, setShowInstagramExporter] = useState(false);
  const [instagramExportBakeLog, setInstagramExportBakeLog] = useState<BakeLog | undefined>(undefined);
  const [aiSubstituteIngredient, setAiSubstituteIngredient] = useState<string | null>(null);

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
        const allLogs = [...cloudLogs, ...localLogs].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        
        setRecipe(data);
        setBakeLogs(allLogs);

        const allPhotos = [...(data.imageUrls || []), ...allLogs.flatMap(l => l.imageUrls || [])];
        if (allPhotos.length > 0) {
          setHeroImage(allPhotos[Math.floor(Math.random() * allPhotos.length)]);
        }

        const map: Record<string, boolean> = {};
        const fuse = new Fuse(pantryData, { keys: ['name'], threshold: 0.35 });

        (data.ingredients || []).forEach(ing => {
          const results = fuse.search(ing.name || '');
          if (results.length > 0) {
            map[ing.name || ''] = true;
          }
        });
        setInPantryMap(map);

      } catch (err) {
        console.error('Failed to load recipe data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  useEffect(() => {
    if (bakeLogs.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const makeIdParam = searchParams.get('makeId');
      const exportParam = searchParams.get('export');

      if (makeIdParam) {
        const foundMake = bakeLogs.find(l => l._id === makeIdParam);
        if (foundMake && foundMake._id !== selectedMake?._id) {
          setSelectedMake(foundMake);
          if (exportParam === 'instagram') {
            setInstagramExportBakeLog(foundMake);
            setShowInstagramExporter(true);
          }
        }
      } else if (selectedMake) {
        // If query param is gone but state is still there (like going back)
        setSelectedMake(null);
      }
    }
  }, [location.search, bakeLogs]);

  const handleCloseMakeDetails = () => {
    setSelectedMake(null);
    navigate(`/recipe/${id}`, { replace: true });
  };

  const toggleCheck = (index: number) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleToggleFavorite = async () => {
    if (!recipe || !id) return;
    const currentTags = recipe.tags || [];
    const isFav = currentTags.includes('Favorite');
    const newTags = isFav ? currentTags.filter(t => t !== 'Favorite') : [...currentTags, 'Favorite'];
    
    try {
      const updated = await api.updateRecipe(id, { tags: newTags });
      setRecipe(updated);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };


  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!');
    });
    setShowExportMenu(false);
    setShowMobileShareModal(false);
  };

  const handleExportGroceryList = () => {
    if (!recipe) return;
    let listText = `Grocery List for ${recipe.title} (x${scaleMultiplier}):\n\n`;
    (recipe.ingredients || []).forEach(ing => {
      const qty = Number((ing.quantity * scaleMultiplier).toFixed(2));
      listText += `- [ ] ${ing.name}: ${qty} ${ing.unit}\n`;
    });
    
    navigator.clipboard.writeText(listText).then(() => {
      alert('Grocery list copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy grocery list', err);
    });
  };

  const handleExportPDF = async () => {
    const node = document.getElementById('recipe-export-node');
    if (!node) return;
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fcf8f2',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('recipe-export-node');
          if (el) {
            el.style.padding = '32px';
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((n) => {
              const htmlNode = n as HTMLElement;
              const style = window.getComputedStyle(htmlNode);
              ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
                if (val && val.includes('oklab')) {
                  htmlNode.style[prop as any] = prop === 'color' ? '#000000' : (prop === 'backgroundColor' ? '#ffffff' : '#cccccc');
                }
              });
            });
          }
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
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
            <Share2 className="w-4 h-4" /> SHARE
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-paper border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
              <button onClick={handleShareLink} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Copy Link
              </button>
              <button onClick={() => { setShowQrModal(true); setShowExportMenu(false); }} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                QR Code
              </button>
              <button onClick={handleExportPDF} className="block w-full text-left px-4 py-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Export PDF
              </button>
            </div>
          )}

          <button 
            onClick={handleToggleFavorite}
            className={`border px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${recipe.tags?.includes('Favorite') ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'}`}
          >
            <Star className={`w-4 h-4 ${recipe.tags?.includes('Favorite') ? 'fill-current' : ''}`} /> 
            {recipe.tags?.includes('Favorite') ? 'FAVORITED' : 'FAVORITE'}
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
            <div className="absolute right-0 top-full mt-2 w-56 bg-paper border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50 text-sm">
              <button onClick={() => { setShowMobileShareModal(true); setShowMobileMenu(false); }} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button 
                onClick={() => { handleToggleFavorite(); setShowMobileMenu(false); }}
                className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle flex justify-between items-center"
              >
                {recipe.tags?.includes('Favorite') ? 'Remove Favorite' : 'Add Favorite'}
                <Star className={`w-4 h-4 ${recipe.tags?.includes('Favorite') ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </button>
              <Link to={`/edit/${recipe._id}`} className="block w-full text-left px-4 py-3 font-medium">
                Edit Recipe
              </Link>
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

          <div className="relative hidden md:block">
            <button 
              onClick={() => setShowStartMenu(!showStartMenu)}
              className="flex bg-ink text-paper px-5 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity uppercase tracking-wide shadow-sm whitespace-nowrap items-center gap-2"
            >
              <Play className="w-4 h-4" fill="currentColor" /> START RECIPE
            </button>
            {showStartMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-paper border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
                <Link to={`/recipe/${recipe._id}/bake`} className="block w-full text-left px-4 py-3 font-medium border-b border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  Start Now
                </Link>
                <button onClick={() => { setShowReverseScheduler(true); setShowStartMenu(false); }} className="block w-full text-left px-4 py-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  Schedule Bake
                </button>
              </div>
            )}
          </div>
        </div>



      {activeTab === 'recipe' ? (
        <>
          {/* Header Card */}
          <div className="flex flex-col md:flex-row gap-8 pb-10 border-b border-border-subtle">
            {heroImage && (
              <img 
                src={heroImage} 
                alt={recipe.title} 
                className="w-full md:w-64 h-64 object-cover rounded-xl border border-border-subtle shadow-sm shrink-0"
              />
            )}
            
            <div className="space-y-4 flex-1">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-ink uppercase">{recipe.title}</h1>
                <p className="text-ink-muted text-lg leading-relaxed">{recipe.description}</p>
              </div>

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {recipe.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-full font-medium text-ink-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-6 md:gap-10 pt-4">
                <div>
                  <div className="font-bold mb-1">Total Time:</div>
                  <div className="text-ink-muted">
                    [{parseInt(recipe.prepTime) + parseInt(recipe.cookTime) || 90} mins]
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

          {showReverseScheduler && (
            <div className="mt-6 mb-2">
              <ReverseBakeScheduler recipe={recipe} onClose={() => setShowReverseScheduler(false)} />
            </div>
          )}

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
                    Copy List
                  </button>
                  <button 
                    onClick={() => setShowBakersMath(!showBakersMath)}
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border transition-colors ${showBakersMath ? 'bg-ink text-paper border-ink' : 'border-border-subtle text-ink-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
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
                        <button
                          onClick={() => setAiSubstituteIngredient(ing.name)}
                          className="ml-auto text-xs text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium hover:underline"
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

            <div>
              <h3 className="font-bold text-lg mb-6 uppercase tracking-wider">Steps / Directions</h3>
              <ol className="space-y-6">
                {(recipe.instructions || []).map((step, i) => (
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
          <div className="flex justify-between items-center border-b border-border-subtle pb-4">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Previous Makes</h2>
          </div>
          
          <BakeLogsGrid 
            logs={bakeLogs} 
            onSelect={(log) => { setSelectedMake(log); setIsEditingDate(false); }}
            onExportInstagram={(log) => {
              setInstagramExportBakeLog(log);
              setShowInstagramExporter(true);
            }}
          />
        </div>
      )}
      {/* Sticky FAB for Mobile */}
      <button 
        onClick={() => setShowMobileStartModal(true)}
        className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] right-4 bg-ink text-paper w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
      >
        <Play className="w-6 h-6 ml-1" fill="currentColor" />
      </button>

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
                        onClick={async () => {
                          try {
                            const newStatus = !selectedMake.isPersonalBest;
                            let updated;
                            if (selectedMake._id!.startsWith('local-')) {
                              const { updateLocalBakeLog } = await import('../lib/localDB');
                              updated = await updateLocalBakeLog(selectedMake._id!, { isPersonalBest: newStatus });
                            } else {
                              updated = await api.updateBakeLog(selectedMake._id!, { isPersonalBest: newStatus });
                            }
                            setSelectedMake(updated);
                            setBakeLogs(prev => prev.map(l => l._id === updated._id ? updated : l));
                          } catch(e) { alert('Failed to update status'); }
                        }} 
                        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${selectedMake.isPersonalBest ? 'bg-yellow-500 text-black border-yellow-500' : 'border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted'}`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {selectedMake.isPersonalBest ? 'Personal Best' : 'Mark as Personal Best'}
                      </button>
                      <button 
                        onClick={() => {
                          setEditDateValue(new Date(selectedMake.date || Date.now()).toISOString().slice(0, 16));
                          setIsEditingDate(true);
                        }} 
                        className="text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink underline"
                      >
                        Edit Date
                      </button>
                      <button 
                        onClick={() => {
                          setInstagramExportBakeLog(selectedMake);
                          setShowInstagramExporter(true);
                        }}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-pink-600 hover:text-pink-500 hover:underline"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        Export to Instagram
                      </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCloseMakeDetails} className="p-2 border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-sm font-bold uppercase tracking-wide px-4 hidden md:block">Go to Recipe</button>
                  <button onClick={handleCloseMakeDetails} className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
              </div>
             
             <div className="space-y-8">
               {selectedMake.notes && (
                 <div>
                   <h3 className="font-bold text-xl mb-3 uppercase tracking-wider border-l-4 border-ink pl-3">Notes & Observations</h3>
                   <div className="bg-black/5 dark:bg-white/5 border border-border-subtle rounded-2xl p-6">
                     <p className="whitespace-pre-wrap leading-relaxed text-lg">{selectedMake.notes}</p>
                   </div>
                 </div>
               )}

               {(selectedMake.images && selectedMake.images.length > 0) || (selectedMake.imageUrls && selectedMake.imageUrls.length > 0) ? (
                 <div>
                   <h3 className="font-bold text-xl mb-4 uppercase tracking-wider border-l-4 border-ink pl-3">Photos</h3>
                   {selectedMake.images && selectedMake.images.length > 0 ? (
                     selectedMake.images.length >= 2 ? (
                       <SideBySideCompare 
                         doughUrl={selectedMake.images[0].url} 
                         bakedUrl={selectedMake.images[1].url} 
                         doughLabel={selectedMake.images[0].label || 'Before'}
                         bakedLabel={selectedMake.images[1].label || 'After'}
                       />
                     ) : (
                       <div className="grid grid-cols-1 gap-6">
                         {selectedMake.images.map((img, i) => (
                           <div key={i} className="relative">
                             <img src={img.url} alt={img.label || `Photo ${i+1}`} className="w-full rounded-2xl border border-border-subtle shadow-md" />
                             {img.label && <span className="absolute bottom-3 right-3 text-xs font-bold uppercase tracking-wider bg-black/70 text-white px-2.5 py-1 rounded-full">{img.label}</span>}
                           </div>
                         ))}
                       </div>
                     )
                   ) : (
                     selectedMake.imageUrls!.length >= 2 ? (
                       <SideBySideCompare doughUrl={selectedMake.imageUrls![0]} bakedUrl={selectedMake.imageUrls![1]} />
                     ) : (
                       <div className="grid grid-cols-1 gap-6">
                         {selectedMake.imageUrls!.map((url, i) => (
                           <img key={i} src={url} alt={`Make photo ${i+1}`} className="w-full rounded-2xl border border-border-subtle shadow-md" />
                         ))}
                       </div>
                     )
                   )}
                 </div>
               ) : null}
              </div>
              <div className="pt-8 mt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-4">
                <button onClick={handleCloseMakeDetails} className="w-full md:w-auto px-6 py-3 border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors font-bold uppercase tracking-wide md:hidden">
                  Go to Recipe
                </button>
                <button 
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this bake log entry?')) return;
                    try {
                      if (selectedMake._id!.startsWith('local-')) {
                        const { deleteLocalBakeLog } = await import('../lib/localDB');
                        await deleteLocalBakeLog(selectedMake._id!);
                      } else {
                        await api.deleteBakeLog(selectedMake._id!);
                      }
                      setBakeLogs(prev => prev.filter(l => l._id !== selectedMake._id));
                      handleCloseMakeDetails();
                    } catch (e) {
                      alert('Failed to delete log entry.');
                    }
                  }} 
                  className="w-full md:w-auto px-6 py-3 text-red-600 border border-red-600/30 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold uppercase tracking-wide"
                >
                  Delete Entry
                </button>
              </div>
            </div>
        </div>
      )}

      {showMobileStartModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center p-4 pb-12">
          <div className="bg-paper p-6 rounded-2xl shadow-2xl relative w-full text-center animate-in slide-in-from-bottom-5">
            <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Start Recipe</h3>
            <div className="space-y-3">
              <Link to={`/recipe/${recipe._id}/bake`} className="block w-full py-4 bg-ink text-paper font-bold rounded-xl text-lg hover:opacity-90">
                Start Now
              </Link>
              <button onClick={() => { setShowReverseScheduler(true); setShowMobileStartModal(false); }} className="block w-full py-4 border border-border-subtle font-bold rounded-xl text-lg hover:bg-black/5 dark:hover:bg-white/5">
                Schedule Bake
              </button>
              <button onClick={() => setShowMobileStartModal(false)} className="block w-full py-4 font-bold rounded-xl text-lg text-ink-muted mt-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMobileShareModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center p-4 pb-12">
          <div className="bg-paper p-6 rounded-2xl shadow-2xl relative w-full text-center animate-in slide-in-from-bottom-5">
            <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Share</h3>
            <div className="space-y-3">
              <button onClick={handleShareLink} className="block w-full py-4 bg-ink text-paper font-bold rounded-xl text-lg hover:opacity-90">
                Copy Link
              </button>
              <button onClick={() => { setShowQrModal(true); setShowMobileShareModal(false); }} className="block w-full py-4 border border-border-subtle font-bold rounded-xl text-lg hover:bg-black/5 dark:hover:bg-white/5">
                QR Code
              </button>
              <button onClick={handleExportPDF} className="block w-full py-4 border border-border-subtle font-bold rounded-xl text-lg hover:bg-black/5 dark:hover:bg-white/5">
                Export PDF
              </button>
              <button onClick={() => setShowMobileShareModal(false)} className="block w-full py-4 font-bold rounded-xl text-lg text-ink-muted mt-2">
                Cancel
              </button>
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

      {aiSubstituteIngredient && (
        <AISubstitutionsModal
          ingredientName={aiSubstituteIngredient}
          recipeTitle={recipe.title}
          onClose={() => setAiSubstituteIngredient(null)}
        />
      )}

      {showInstagramExporter && (
        <InstagramExporter 
          recipe={recipe} 
          bakeLog={instagramExportBakeLog}
          onClose={() => {
            setShowInstagramExporter(false);
            setInstagramExportBakeLog(undefined);
          }} 
        />
      )}
    </div>
  );
}
