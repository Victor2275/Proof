import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, type BakeLog } from '../lib/api';
import { useRecipe, useRecipeBakeLogs, usePantry, useUpdateRecipe } from '../lib/queries';
import { updateLocalBakeLog, deleteLocalBakeLog } from '../lib/localDB';
import ReverseBakeScheduler from './ReverseBakeScheduler';
import AISubstitutionsModal from './AISubstitutionsModal';
import BakeLogsGrid from './BakeLogsGrid';
import RecipeHeader from './RecipeHeader';
import IngredientList from './IngredientList';
import InstructionList from './InstructionList';
import SideBySideCompare from './SideBySideCompare';
import { Edit, MoreVertical, Play, Star, Award, Share2 } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { Button, Panel, PanelRow, Field, Sheet, buttonClassName, cn } from './ui';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Fuse from 'fuse.js';

// html2canvas + jspdf are ~780 kB together and only run when the user actually
// exports. The Instagram exporter is a full-screen modal opened on demand. All
// three load lazily so viewing a recipe doesn't pay for them.
const InstagramExporter = lazy(() => import('./InstagramExporter'));


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



/*
 * One row of a dropdown. Menus in this world are panels with rules between
 * their items, not floating cards with shadows.
 */
const MENU_ITEM =
  'block w-full border-b border-rule px-4 py-3 text-left text-sm text-ink hover:bg-panel-sunk';

const EMPTY_LOGS: BakeLog[] = [];
const EMPTY_PANTRY: any[] = []; // or actual type if imported

export default function RecipeViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: recipe, isLoading: loadingRecipe } = useRecipe(id);
  const { data: bakeLogs = EMPTY_LOGS, isLoading: loadingLogs } = useRecipeBakeLogs(id);
  const { data: pantryData = EMPTY_PANTRY } = usePantry();
  
  const loading = loadingRecipe || loadingLogs;

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

  // Editing photo tags
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<{url: string, label: string}[]>([]);

  // The make detail reports through the panel rather than through alert().
  const [makeError, setMakeError] = useState('');
  const [makeNotice, setMakeNotice] = useState('');
  const [confirmingMakeDelete, setConfirmingMakeDelete] = useState(false);

  const inPantryMap = useMemo(() => {
    if (!recipe || !pantryData.length) return {};
    const map: Record<string, boolean> = {};
    const fuse = new Fuse(pantryData, { keys: ['name'], threshold: 0.35 });
    (recipe.ingredients || []).forEach(ing => {
      const results = fuse.search(ing.name || '');
      if (results.length > 0) {
        map[ing.name || ''] = true;
      }
    });
    return map;
  }, [recipe, pantryData]);

  useEffect(() => {
    if (recipe?.imageUrls && recipe.imageUrls.length > 0) {
      setHeroImage(recipe.imageUrls[0]);
    }
  }, [recipe]);

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
    setMakeError('');
    setMakeNotice('');
    setEditingTagsFor(null);
    navigate(`/recipe/${id}`, { replace: true });
  };

  const toggleCheck = (index: number) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const { mutateAsync: updateRecipe } = useUpdateRecipe();

  const handleToggleFavorite = async () => {
    if (!recipe || !id) return;
    const currentTags = recipe.tags || [];
    const isFav = currentTags.includes('Favorite');
    const newTags = isFav ? currentTags.filter(t => t !== 'Favorite') : [...currentTags, 'Favorite'];
    
    try {
      await updateRecipe({ id, data: { tags: newTags } as any });
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
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
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

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 pt-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="hidden md:flex gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <Skeleton className="h-[40vh] w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 mb-6" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 mb-6" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    </div>
  );
  if (!recipe) return <div className="text-center py-20 text-ink-muted">Recipe not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start md:items-center gap-4 pb-6">
        {/* The recipe's own title is the heading of this page; a second
          * "VIEW RECIPE" above it named the route rather than the thing. */}
        <Link to="/" className="label-silkscreen text-ink-muted hover:text-ink">
          ← Cookbook
        </Link>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex flex-wrap items-center gap-3 relative">
          <Button variant="ghost" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
          
          {showExportMenu && (
            <div className="absolute top-full left-0 z-50 mt-2 w-56 overflow-hidden rounded-panel border border-rule bg-panel faceplate">
              <button onClick={handleShareLink} className={MENU_ITEM}>
                Copy link
              </button>
              <button onClick={() => { setShowQrModal(true); setShowExportMenu(false); }} className={MENU_ITEM}>
                QR code
              </button>
              <button onClick={handleExportPDF} className={cn(MENU_ITEM, 'border-b-0')}>
                Export PDF
              </button>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            engaged={recipe.tags?.includes('Favorite')}
            onClick={handleToggleFavorite}
          >
            <Star className={cn('w-4 h-4', recipe.tags?.includes('Favorite') && 'fill-current')} />
            {recipe.tags?.includes('Favorite') ? 'Favorited' : 'Favorite'}
          </Button>
          <Link to={`/edit/${recipe._id}`} className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
            <Edit className="w-4 h-4" /> Edit
          </Link>
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden relative">
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 -mr-2 text-ink">
            <MoreVertical className="w-6 h-6" />
          </button>
          
          {showMobileMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-panel border border-rule bg-panel faceplate">
              <button onClick={() => { setShowMobileShareModal(true); setShowMobileMenu(false); }} className={cn(MENU_ITEM, 'flex items-center gap-2')}>
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button
                onClick={() => { handleToggleFavorite(); setShowMobileMenu(false); }}
                className={cn(MENU_ITEM, 'flex items-center justify-between')}
              >
                {recipe.tags?.includes('Favorite') ? 'Remove favorite' : 'Add favorite'}
                <Star className={cn('w-4 h-4', recipe.tags?.includes('Favorite') && 'fill-current')} />
              </button>
              <Link to={`/edit/${recipe._id}`} className={cn(MENU_ITEM, 'block border-b-0')}>
                Edit recipe
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* The export node needs an opaque background for html2canvas, but it is
        * the page itself, not a panel — painting it panel-coloured laid a
        * lighter slab behind the whole recipe that lined up with nothing. */}
      <div id="recipe-export-node" className="bg-ground text-ink">
        {/* Top Controls */}
        {/* `overflow-x-auto` is what lets the control bank scroll on a phone,
          * but it also makes this element a clipping context — which cut the
          * Start Recipe menu off at the row's own bottom edge. The menu only
          * exists from `md` up, which is exactly where the row no longer needs
          * to scroll, so the overflow is released at that breakpoint. */}
        <div className="no-scrollbar flex flex-nowrap items-center gap-4 overflow-x-auto pb-6 md:flex-wrap md:overflow-x-visible" data-html2canvas-ignore="true">
          {/* The scale bank. A multiplier switch: one engaged at a time, and
            * the recipe as written is 1x. */}
          <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Scale recipe">
            <span className="label-silkscreen text-silkscreen">Scale</span>
            <div className="flex gap-px">
              {[0.5, 1, 2, 3].map(m => (
                <Button
                  key={m}
                  variant="secondary"
                  size="sm"
                  engaged={scaleMultiplier === m}
                  onClick={() => setScaleMultiplier(m)}
                >
                  {m}x
                </Button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 gap-px">
            <Button
              variant="secondary"
              size="sm"
              engaged={activeTab === 'recipe'}
              onClick={() => setActiveTab('recipe')}
            >
              Recipe
            </Button>
            <Button
              variant="secondary"
              size="sm"
              engaged={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              Previous makes {bakeLogs.length > 0 ? `(${bakeLogs.length})` : ''}
            </Button>
          </div>

          {/* The only solid signal-red control on the page: the one that
            * starts something happening. */}
          <div className="relative hidden shrink-0 md:block">
            <Button variant="primary" size="sm" onClick={() => setShowStartMenu(!showStartMenu)}>
              <Play className="w-4 h-4" fill="currentColor" /> Start recipe
            </Button>
            {showStartMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-panel border border-rule bg-panel faceplate">
                <Link to={`/recipe/${recipe._id}/bake`} className={cn(MENU_ITEM, 'block')}>
                  Start now
                </Link>
                <button onClick={() => { setShowReverseScheduler(true); setShowStartMenu(false); }} className={cn(MENU_ITEM, 'border-b-0')}>
                  Schedule bake
                </button>
              </div>
            )}
          </div>
        </div>



      {activeTab === 'recipe' ? (
        <>
          <RecipeHeader recipe={recipe} heroImage={heroImage} scaleMultiplier={scaleMultiplier} />

          {showReverseScheduler && (
            <div className="mt-6 mb-2">
              <ReverseBakeScheduler recipe={recipe} onClose={() => setShowReverseScheduler(false)} />
            </div>
          )}

          {/* Ingredients and Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
            <IngredientList 
              recipe={recipe}
              scaleMultiplier={scaleMultiplier}
              showBakersMath={showBakersMath}
              setShowBakersMath={setShowBakersMath}
              inPantryMap={inPantryMap}
              checkedIngredients={checkedIngredients}
              toggleCheck={toggleCheck}
              setAiSubstituteIngredient={setAiSubstituteIngredient}
              handleExportGroceryList={handleExportGroceryList}
            />
            <InstructionList recipe={recipe} />
          </div>

          {/* Lab Notes */}
          {recipe.labNotes && (
            <div className="pt-10">
              <Panel title="Lab notes & iterations">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink-muted">
                  {recipe.labNotes}
                </pre>
              </Panel>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 className="label-silkscreen">Previous makes</h2>
            <span className="label-silkscreen text-ink-muted">{bakeLogs.length} logged</span>
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
      <button 
        onClick={() => setShowMobileStartModal(true)}
        className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] right-4 bg-accent text-black w-14 h-14 rounded-full flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
      >
        <Play className="w-6 h-6 ml-1" fill="currentColor" />
      </button>

      {/*
        * The selected make.
        *
        * Phase 5 rebuilt the grid of makes and left this detail behind: rounded
        * cards, 4px left-border headings, shadowed photographs — the previous
        * world, reachable in two clicks from a page that is not. It is a Sheet
        * on the primitives now, and the alert()s and confirm()s it reported
        * through are panels and a confirmation sheet.
        */}
      <Sheet
        open={selectedMake !== null}
        onClose={handleCloseMakeDetails}
        title={
          selectedMake && bakeLogs.findIndex((l) => l._id === selectedMake._id) !== -1
            ? `Make #${bakeLogs.length - bakeLogs.findIndex((l) => l._id === selectedMake._id)}`
            : 'Make'
        }
        size="xl"
        actions={
          <Button variant="ghost" size="sm" onClick={handleCloseMakeDetails}>
            Go to recipe
          </Button>
        }
        footer={
          selectedMake ? (
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  const photoUrl = selectedMake.images?.[0]?.url || selectedMake.imageUrls?.[0];
                  if (!photoUrl || !recipe) return;
                  try {
                    await api.updateRecipe(recipe._id!, {
                      imageUrls: [
                        photoUrl,
                        ...(recipe.imageUrls || []).filter((u) => u !== photoUrl),
                      ],
                    });
                    queryClient.invalidateQueries({ queryKey: ['recipe', id] });
                    setMakeNotice('This bake is now the cover photograph.');
                  } catch {
                    setMakeError('Could not set the cover photograph.');
                  }
                }}
              >
                Set as cover
              </Button>
              <Button variant="danger" onClick={() => setConfirmingMakeDelete(true)}>
                Delete entry
              </Button>
            </>
          ) : null
        }
      >
        {selectedMake ? (
          <div className="flex flex-col gap-5">
            {makeError ? (
              <p className="border border-signal bg-panel p-3 text-sm text-signal" role="alert">
                {makeError}
              </p>
            ) : null}
            {makeNotice ? (
              <p className="border border-rule bg-panel-sunk p-3 text-sm text-ink" role="status">
                {makeNotice}
              </p>
            ) : null}

            <Panel title="Bake">
              <div className="flex flex-col gap-3">
                {isEditingDate ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Field
                      label="Date and time"
                      type="datetime-local"
                      className="flex-1"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const patch = { date: new Date(editDateValue).toISOString() };
                          const updated = selectedMake._id!.startsWith('local-')
                            ? await updateLocalBakeLog(selectedMake._id!, patch)
                            : await api.updateBakeLog(selectedMake._id!, patch);
                          setSelectedMake(updated);
                          queryClient.invalidateQueries({ queryKey: ['bakeLogs', id] });
                          setIsEditingDate(false);
                        } catch {
                          setMakeError('Could not change the date of this bake.');
                        }
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setIsEditingDate(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <PanelRow
                      label="Baked"
                      value={new Date(selectedMake.date || Date.now()).toLocaleString()}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        engaged={selectedMake.isPersonalBest}
                        icon={<Award className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          try {
                            const patch = { isPersonalBest: !selectedMake.isPersonalBest };
                            const updated = selectedMake._id!.startsWith('local-')
                              ? await updateLocalBakeLog(selectedMake._id!, patch)
                              : await api.updateBakeLog(selectedMake._id!, patch);
                            setSelectedMake(updated);
                            queryClient.invalidateQueries({ queryKey: ['bakeLogs', id] });
                          } catch {
                            setMakeError('Could not change the personal-best mark.');
                          }
                        }}
                      >
                        {selectedMake.isPersonalBest ? 'Personal best' : 'Mark as personal best'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditDateValue(
                            new Date(selectedMake.date || Date.now()).toISOString().slice(0, 16),
                          );
                          setIsEditingDate(true);
                        }}
                      >
                        Edit date
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Instagram className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setInstagramExportBakeLog(selectedMake);
                          setShowInstagramExporter(true);
                        }}
                      >
                        Export
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Panel>

            {selectedMake.notes ? (
              <Panel title="Notes">
                <p className="font-prose whitespace-pre-wrap text-ink">{selectedMake.notes}</p>
              </Panel>
            ) : null}

            {(selectedMake.images && selectedMake.images.length > 0) ||
            (selectedMake.imageUrls && selectedMake.imageUrls.length > 0) ? (
              <Panel
                title="Photographs"
                actions={
                  editingTagsFor === selectedMake._id ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTagsFor(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = selectedMake._id!.startsWith('local-')
                              ? await updateLocalBakeLog(selectedMake._id!, { images: tempTags })
                              : await api.updateBakeLog(selectedMake._id!, { images: tempTags });
                            setSelectedMake(updated);
                            queryClient.invalidateQueries({ queryKey: ['bakeLogs', id] });
                            setEditingTagsFor(null);
                          } catch {
                            setMakeError('Could not save those labels.');
                          }
                        }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTagsFor(selectedMake._id!);
                        setTempTags(
                          selectedMake.images
                            ? [...selectedMake.images]
                            : selectedMake.imageUrls!.map((url) => ({ url, label: '' })),
                        );
                      }}
                    >
                      Label them
                    </Button>
                  )
                }
              >
                {editingTagsFor === selectedMake._id ? (
                  <div className="flex flex-col gap-4">
                    {tempTags.map((img, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <img
                          src={img.url}
                          alt={`Photograph ${i + 1}`}
                          className="w-full border border-rule"
                        />
                        <Field
                          label={`Label for photograph ${i + 1}`}
                          hideLabel
                          value={img.label}
                          onChange={(e) => {
                            const next = [...tempTags];
                            next[i] = { ...next[i], label: e.target.value };
                            setTempTags(next);
                          }}
                          placeholder="Dough, after bake, crumb…"
                        />
                      </div>
                    ))}
                  </div>
                ) : selectedMake.images && selectedMake.images.length > 0 ? (
                  selectedMake.images.length >= 2 ? (
                    <SideBySideCompare
                      doughUrl={selectedMake.images[0].url}
                      bakedUrl={selectedMake.images[1].url}
                      doughLabel={selectedMake.images[0].label || 'Before'}
                      bakedLabel={selectedMake.images[1].label || 'After'}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {selectedMake.images.map((img, i) => (
                        <figure key={i} className="relative">
                          <img
                            src={img.url}
                            alt={img.label || `Photograph ${i + 1}`}
                            className="w-full border border-rule"
                          />
                          {img.label ? (
                            <figcaption className="label-silkscreen absolute bottom-2 right-2 border border-rule bg-panel px-2 py-1 text-ink">
                              {img.label}
                            </figcaption>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                  )
                ) : selectedMake.imageUrls!.length >= 2 ? (
                  <SideBySideCompare
                    doughUrl={selectedMake.imageUrls![0]}
                    bakedUrl={selectedMake.imageUrls![1]}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {selectedMake.imageUrls!.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Photograph ${i + 1}`}
                        className="w-full border border-rule"
                      />
                    ))}
                  </div>
                )}
              </Panel>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={confirmingMakeDelete}
        onClose={() => setConfirmingMakeDelete(false)}
        title="Delete this bake"
        size="sm"
        layer={120}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingMakeDelete(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!selectedMake) return;
                setConfirmingMakeDelete(false);
                try {
                  if (selectedMake._id!.startsWith('local-')) {
                    await deleteLocalBakeLog(selectedMake._id!);
                  } else {
                    await api.deleteBakeLog(selectedMake._id!);
                  }
                  queryClient.invalidateQueries({ queryKey: ['bakeLogs', id] });
                  handleCloseMakeDetails();
                } catch {
                  setMakeError('Could not delete that bake log.');
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete this bake log? Its notes and photographs go with it, and the recipe keeps its
          remaining bakes.
        </p>
      </Sheet>

      {/*
        * The phone's start and share sheets. Both rise from the bottom edge,
        * which is where the thumb already is, and both are one decision.
        */}
      <Sheet
        open={showMobileStartModal}
        onClose={() => setShowMobileStartModal(false)}
        title="Start recipe"
        placement="bottom"
      >
        <div className="flex flex-col gap-2">
          <Link
            to={`/recipe/${recipe._id}/bake`}
            className={buttonClassName({ variant: 'primary', size: 'lg', className: 'w-full' })}
          >
            Start now
          </Link>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setShowReverseScheduler(true);
              setShowMobileStartModal(false);
            }}
          >
            Schedule bake
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={showMobileShareModal}
        onClose={() => setShowMobileShareModal(false)}
        title="Share"
        placement="bottom"
      >
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" className="w-full" onClick={handleShareLink}>
            Copy link
          </Button>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setShowQrModal(true);
              setShowMobileShareModal(false);
            }}
          >
            QR code
          </Button>
          <Button size="lg" className="w-full" onClick={handleExportPDF}>
            Export PDF
          </Button>
        </div>
      </Sheet>

      </div>

      <Sheet
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={recipe.title}
        size="sm"
      >
        <div className="flex flex-col items-center gap-4">
          {/*
            * The code keeps its white quiet zone in both themes: a scanner reads
            * contrast, not taste, and an inverted code is an unreadable one.
            */}
          <div className="border border-rule bg-white p-4">
            <QRCodeSVG value={window.location.href} size={200} level="M" />
          </div>
          <p className="text-sm text-ink-muted">Scan to open this recipe on a phone.</p>
        </div>
      </Sheet>

      {aiSubstituteIngredient && (
        <AISubstitutionsModal
          ingredientName={aiSubstituteIngredient}
          recipeTitle={recipe.title}
          onClose={() => setAiSubstituteIngredient(null)}
        />
      )}

      {showInstagramExporter && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center text-white/70 text-sm">Loading exporter…</div>}>
          <InstagramExporter
            recipe={recipe}
            bakeLog={instagramExportBakeLog}
            onClose={() => {
              setShowInstagramExporter(false);
              setInstagramExportBakeLog(undefined);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
