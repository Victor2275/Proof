import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import type { BakeLog, PantryItem, PublishedRecipe, Recipe } from '../lib/types';
import { ApiError } from '../lib/api';
import {
  useRecipe,
  useRecipes,
  useRecipeBakeLogs,
  usePantry,
  useUpdateRecipe,
  useUpdateBakeLog,
  useDeleteBakeLog,
  usePublishedRecipe,
  useForkPublished,
} from '../lib/queries';
import { useOwnership } from '../lib/session';
import PublicationStrip from './PublicationStrip';
import SharedRecipeCommunity from './SharedRecipeCommunity';
import { formatIngredient } from '../lib/ingredients';
import ReverseBakeScheduler from './ReverseBakeScheduler';
import NotFound from './NotFound';
import AISubstitutionsModal from './AISubstitutionsModal';
import BakeLogsGrid from './BakeLogsGrid';
import RecipeHeader from './RecipeHeader';
import IngredientList from './IngredientList';
import InstructionList from './InstructionList';
import SideBySideCompare from './SideBySideCompare';
import { Edit, MoreVertical, Play, Star, Award, Share2 } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { Button, Menu, MenuItem, Panel, PanelRow, Field, Photo, Sheet, buttonClassName, cn } from './ui';
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



const EMPTY_LOGS: BakeLog[] = [];
const EMPTY_PANTRY: PantryItem[] = [];
const EMPTY_RECIPES: Recipe[] = [];

/*
 * Two routes, one viewer (decision B4).
 *
 * /recipe/:id is a recipe in this cookbook: read from the device, with the
 * owner's controls, its bake history and its lab notes. /r/:slug is a recipe
 * in the shared cookbook, read from the server: the same page with the owner's
 * controls off, an attribution line, and one primary control — save it.
 */
export default function RecipeViewer() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const localQuery = useRecipe(slug ? undefined : id);
  const sharedQuery = usePublishedRecipe(slug);
  const recipe = slug ? sharedQuery.data : localQuery.data;
  const { isMine, isFork } = useOwnership(recipe);
  const localRecipe = isMine ? (recipe as Recipe) : null;
  const { data: bakeLogs = EMPTY_LOGS } = useRecipeBakeLogs(localRecipe ? id : undefined);
  const { data: pantryData = EMPTY_PANTRY } = usePantry();
  const { data: myRecipes = EMPTY_RECIPES } = useRecipes();
  const updateBakeLog = useUpdateBakeLog();
  const deleteBakeLog = useDeleteBakeLog();
  const forkPublished = useForkPublished();

  // A shared recipe already saved here: offer the copy rather than a second one.
  const savedCopy = slug && recipe
    ? myRecipes.find((r) => r.forkedFrom?.publishedId === recipe._id)
    : undefined;

  // Who can follow a link to this page: anyone, for a shared recipe or the
  // original a copy came from. A recipe that exists only on this device has
  // no address anyone else can open, so it offers none.
  const shareUrl = slug
    ? `${window.location.origin}/r/${slug}`
    : localRecipe?.forkedFrom
      ? `${window.location.origin}/r/${localRecipe.forkedFrom.slug}`
      : null;

  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<'recipe' | 'history'>('recipe');
  const [selectedMake, setSelectedMake] = useState<BakeLog | null>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState('');
  const [showBakersMath, setShowBakersMath] = useState(() => localStorage.getItem('defaultBakersMath') === 'true');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showReverseScheduler, setShowReverseScheduler] = useState(false);
  const schedulerRef = useRef<HTMLDivElement>(null);
  const [showMobileStartModal, setShowMobileStartModal] = useState(false);
  const [heroImage, setHeroImage] = useState<string>('');
  const [showInstagramExporter, setShowInstagramExporter] = useState(false);
  const [instagramExportBakeLog, setInstagramExportBakeLog] = useState<BakeLog | undefined>(undefined);
  const [aiSubstituteIngredient, setAiSubstituteIngredient] = useState<string | null>(null);

  // Temporary checkbox state (visual only)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Editing photo tags
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<{url: string, label: string}[]>([]);

  // Transient confirmations — copied, exported — report here rather than in a
  // browser alert.
  const [copyNotice, setCopyNotice] = useState('');

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
    setHeroImage(recipe?.imageUrls?.[0] ?? '');
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

  useEffect(() => {
    if (!copyNotice) return;
    const timer = setTimeout(() => setCopyNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [copyNotice]);

  /*
   * The schedule belongs to the recipe view, and Start can be pressed from
   * either view and from anywhere down a long method. Opening it switches to
   * the recipe view and brings the schedule into sight; otherwise the press
   * did nothing the baker could see.
   */
  const openScheduler = () => {
    setActiveTab('recipe');
    setShowReverseScheduler(true);
  };

  useEffect(() => {
    if (!showReverseScheduler) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    schedulerRef.current?.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }, [showReverseScheduler]);

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
    if (!localRecipe) return;
    const currentTags = localRecipe.tags || [];
    const isFav = currentTags.includes('Favorite');
    const newTags = isFav ? currentTags.filter(t => t !== 'Favorite') : [...currentTags, 'Favorite'];

    try {
      await updateRecipe({ id: localRecipe._id, data: { tags: newTags } });
    } catch {
      setCopyNotice("Couldn't save the favorite. Try again.");
    }
  };

  const handleSaveToCookbook = () => {
    if (!recipe || isMine) return;
    forkPublished.mutate(recipe as Parameters<typeof forkPublished.mutate>[0], {
      onSuccess: (saved) => navigate(`/recipe/${saved._id}`),
      onError: (err) => setCopyNotice(err instanceof Error ? err.message : 'That recipe could not be saved.'),
    });
  };


  /*
   * "Copied" used to be a browser alert — a modal dialog, from the operating
   * system, over a sheet, dismissed by a second click, to confirm something
   * that already worked. It is a status strip that takes itself away.
   */
  const handleShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => setCopyNotice('Link copied.'))
      .catch(() => setCopyNotice('Could not reach the clipboard.'));
    setShowMobileMenu(false);
  };

  const handleExportGroceryList = () => {
    if (!recipe) return;
    let listText = `Grocery List for ${recipe.title} (x${scaleMultiplier}):\n\n`;
    (recipe.ingredients || []).forEach(ing => {
      listText += `- [ ] ${formatIngredient(ing, scaleMultiplier)}\n`;
    });
    
    navigator.clipboard
      .writeText(listText)
      .then(() => setCopyNotice('Grocery list copied.'))
      .catch(() => setCopyNotice('Could not reach the clipboard.'));
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
    } catch {
      setCopyNotice("Couldn't build the PDF. Try again.");
    }
    setShowMobileMenu(false);
  };

  /*
   * A recipe in this cookbook is read from the device, which takes
   * milliseconds: nothing is drawn while it arrives, rather than a skeleton
   * that flashes (B30). A shared recipe comes over the network, so it gets the
   * skeleton: the shape of the page it is standing in for.
   */
  if (slug ? sharedQuery.isPending : localQuery.isPending) {
    if (!slug) return null;
    return (
      <div className="@container mx-auto flex max-w-4xl flex-col pb-20 md:pt-4" role="status" aria-label="Opening the recipe">
        <div className="flex h-11 items-center">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-8 h-10 w-3/4 sm:h-12" />
        <div className="mt-6 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-8">
          <Skeleton className="aspect-square w-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-40 max-w-full" />
            <Skeleton className="h-6 w-32 max-w-full" />
          </div>
        </div>
        <Skeleton className="mt-8 h-16 w-full" />
        <div className="mt-8 grid grid-cols-1 gap-12 @3xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  // A shared recipe that has been unpublished is a page that no longer exists.
  const sharedGone = slug && sharedQuery.error instanceof ApiError && sharedQuery.error.status === 404;
  const failure = slug ? (sharedGone ? null : sharedQuery.error) : localQuery.error;
  if (failure) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
        <Panel title={slug ? 'Shared cookbook' : 'This device'}>
          <div className="flex flex-col gap-4" role="alert">
            <p className="font-title text-lg text-ink">
              {slug ? "Couldn't open this shared recipe" : "Couldn't open this recipe on this device"}
            </p>
            <p className="text-sm text-ink-muted">
              {failure instanceof Error ? failure.message : 'Something went wrong reading it.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => (slug ? sharedQuery.refetch() : localQuery.refetch())}>Try again</Button>
              <Link to="/" className={buttonClassName({ variant: 'ghost' })}>
                Back to the cookbook
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }
  // The same unlit panel as any address that is not wired to anything: it
  // names the problem and the way back, which a bare sentence did not.
  if (!recipe) return <NotFound />;

  /*
   * The page reads top to bottom in the order a baker uses it: which recipe
   * this is, then the transport strip that switches the view and starts the
   * bake, then the view itself. The masthead stays when the view changes. The
   * previous makes are this recipe's history, and the history used to open
   * with no title above it at all.
   */
  return (
    <div className="@container mx-auto flex max-w-4xl flex-col pb-20 md:pt-4">

      {/* Top bar. On a wide screen its centre line is the sidebar wordmark's. */}
      <div className="flex h-11 items-center justify-between gap-4">
        {/* The recipe's own title is the heading of this page; a second
          * "VIEW RECIPE" above it named the route rather than the thing. */}
        {/* A shared recipe came from the shared cookbook, and goes back to it. */}
        <Link to={slug ? '/discover' : '/'} className="ui-label text-ink-muted hover:text-ink">
          {slug ? '← Discover' : '← Cookbook'}
        </Link>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Menu
            label="Share"
            align="right"
            trigger={(props) => (
              <Button variant="ghost" size="sm" {...props}>
                <Share2 className="w-4 h-4" aria-hidden="true" /> Share
              </Button>
            )}
          >
            {shareUrl ? (
              <MenuItem onSelect={handleShareLink}>{isFork ? 'Copy link to the original' : 'Copy link'}</MenuItem>
            ) : null}
            {shareUrl ? <MenuItem onSelect={() => setShowQrModal(true)}>QR code</MenuItem> : null}
            <MenuItem onSelect={handleExportPDF}>Export PDF</MenuItem>
          </Menu>

          {localRecipe ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                engaged={localRecipe.tags?.includes('Favorite')}
                onClick={handleToggleFavorite}
              >
                <Star className={cn('w-4 h-4', localRecipe.tags?.includes('Favorite') && 'fill-current')} />
                {localRecipe.tags?.includes('Favorite') ? 'Favorited' : 'Favorite'}
              </Button>
              <Link to={`/edit/${localRecipe._id}`} className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
                <Edit className="w-4 h-4" /> Edit
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile Actions — one bottom sheet, where the thumb already is. */}
        <button
          type="button"
          onClick={() => setShowMobileMenu(true)}
          aria-label="More actions"
          aria-haspopup="dialog"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-control text-ink md:hidden"
        >
          <MoreVertical className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      
      {/* The export node needs an opaque background for html2canvas, but it is
        * the page itself, not a panel — painting it panel-coloured laid a
        * lighter slab behind the whole recipe that lined up with nothing. */}
      <div id="recipe-export-node" className="mt-8 bg-ground text-ink">
        <RecipeHeader recipe={recipe} heroImage={heroImage} scaleMultiplier={scaleMultiplier} />
        {localRecipe ? <PublicationStrip recipe={localRecipe} /> : null}

        {/*
          * The transport strip: which view, and play. It sits between the
          * masthead and the view it switches, so the switch is next to what it
          * changes, and Start follows the step row whose pattern it runs. Both
          * views fit at 375px without scrolling sideways. The old bank
          * scrolled, and on a phone the Previous makes key started off-screen.
          */}
        {localRecipe ? (
        <div
          className="mt-8 flex items-center justify-between gap-4 border-y border-rule py-3"
          data-html2canvas-ignore="true"
        >
          <div className="flex gap-px" role="group" aria-label="View">
            <Button
              variant="secondary"
              engaged={activeTab === 'recipe'}
              onClick={() => setActiveTab('recipe')}
            >
              Recipe
            </Button>
            <Button
              variant="secondary"
              engaged={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              Previous makes {bakeLogs.length > 0 ? `(${bakeLogs.length})` : ''}
            </Button>
          </div>

          {/* The only solid signal-red control on the page: the one that
            * starts something happening. On a phone the same key is the fixed
            * square in the corner. */}
          <Menu
            label="Start recipe"
            align="right"
            className="hidden shrink-0 md:block"
            trigger={(props) => (
              <Button variant="primary" {...props}>
                <Play className="w-4 h-4" fill="currentColor" aria-hidden="true" /> Start recipe
              </Button>
            )}
          >
            <MenuItem to={`/recipe/${recipe._id}/bake`}>Start now</MenuItem>
            <MenuItem onSelect={openScheduler}>Schedule bake</MenuItem>
          </Menu>
        </div>
        ) : (
          /* A shared recipe: one primary control, and it is "make it yours".
           * Baking it starts from the copy, where the bake can be logged. */
          <div
            className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-rule py-3"
            data-html2canvas-ignore="true"
          >
            <p className="text-sm text-ink-muted">
              {savedCopy ? 'Already in your cookbook.' : 'Save it to bake it, log it and change it.'}
            </p>
            {savedCopy ? (
              <Link to={`/recipe/${savedCopy._id}`} className={buttonClassName({ variant: 'secondary' })}>
                Open my copy
              </Link>
            ) : (
              <Button variant="primary" busy={forkPublished.isPending} onClick={handleSaveToCookbook}>
                Save to my cookbook
              </Button>
            )}
          </div>
        )}

      {activeTab === 'recipe' ? (
        <>
          {/* Opened from the transport strip, so it unfolds right under it. */}
          {showReverseScheduler && localRecipe && (
            <div ref={schedulerRef} className="mt-8 scroll-mt-4">
              <ReverseBakeScheduler recipe={localRecipe} onClose={() => setShowReverseScheduler(false)} />
            </div>
          )}

          {/*
            * Ingredients and method. The lab notes travel with the ingredients:
            * they say what the baker would change ("half the salt next time"),
            * so they are read before the method, not after it. Side by side,
            * they also fill the ingredient column, which a short list left
            * empty beside a long method.
            */}
          <div className="mt-8 grid grid-cols-1 gap-12 @3xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-8">
              <IngredientList
                recipe={recipe}
                scaleMultiplier={scaleMultiplier}
                setScaleMultiplier={setScaleMultiplier}
                showBakersMath={showBakersMath}
                setShowBakersMath={setShowBakersMath}
                inPantryMap={inPantryMap}
                checkedIngredients={checkedIngredients}
                toggleCheck={toggleCheck}
                setAiSubstituteIngredient={setAiSubstituteIngredient}
                handleExportGroceryList={handleExportGroceryList}
              />

              {/* Lab notes are the owner's notes to themselves (B4). */}
              {localRecipe?.labNotes && (
                <Panel title="Lab notes & iterations">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">
                    {localRecipe.labNotes}
                  </pre>
                </Panel>
              )}
            </div>
            <InstructionList recipe={recipe} />
          </div>
        </>
      ) : (
        <section className="mt-8 flex flex-col gap-6" aria-labelledby="previous-makes-heading">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 id="previous-makes-heading" className="ui-label">Previous makes</h2>
            <span className="ui-label text-ink-muted">{bakeLogs.length} logged</span>
          </div>

          <BakeLogsGrid
            logs={bakeLogs}
            onSelect={(log) => { setSelectedMake(log); setIsEditingDate(false); }}
            onExportInstagram={(log) => {
              setInstagramExportBakeLog(log);
              setShowInstagramExporter(true);
            }}
          />
        </section>
      )}
      {/* A shared recipe's ratings, bakes and conversation follow the recipe itself. */}
      {slug && recipe && !localRecipe ? <SharedRecipeCommunity recipe={recipe as PublishedRecipe} /> : null}

      {/* The phone's Start key: the page's one red control, drawn as the same
        * square key as New Recipe, which it sits over in this corner. */}
      {localRecipe ? (
      <button
        type="button"
        onClick={() => setShowMobileStartModal(true)}
        aria-label="Start recipe"
        className="above-nav md:hidden fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-control border border-signal bg-signal text-on-signal active:translate-y-px"
      >
        <Play className="h-6 w-6" fill="currentColor" aria-hidden="true" />
      </button>
      ) : null}

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
            ? `Make ${bakeLogs.length - bakeLogs.findIndex((l) => l._id === selectedMake._id)}`
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
                  if (!photoUrl || !localRecipe) return;
                  try {
                    await updateRecipe({
                      id: localRecipe._id,
                      data: {
                        imageUrls: [photoUrl, ...(localRecipe.imageUrls || []).filter((u) => u !== photoUrl)],
                      },
                    });
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
              <p className="border border-fault bg-panel p-3 text-sm text-fault" role="alert">
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
                          const updated = await updateBakeLog.mutateAsync({
                            id: selectedMake._id,
                            patch: { date: new Date(editDateValue).toISOString() },
                          });
                          setSelectedMake(updated);
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
                      value={new Date(selectedMake.date || Date.now()).toLocaleString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        engaged={selectedMake.isPersonalBest}
                        icon={<Award className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          try {
                            const updated = await updateBakeLog.mutateAsync({
                              id: selectedMake._id,
                              patch: { isPersonalBest: !selectedMake.isPersonalBest },
                            });
                            setSelectedMake(updated);
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
                            const updated = await updateBakeLog.mutateAsync({
                              id: selectedMake._id,
                              patch: { images: tempTags },
                            });
                            setSelectedMake(updated);
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
                        setEditingTagsFor(selectedMake._id);
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
                        <Photo
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
                          <Photo
                            src={img.url}
                            alt={img.label || `Photograph ${i + 1}`}
                            className="w-full border border-rule"
                          />
                          {img.label ? (
                            <figcaption className="ui-label absolute bottom-2 right-2 border border-rule bg-panel px-2 py-1 text-ink">
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
                      <Photo
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
                  await deleteBakeLog.mutateAsync(selectedMake._id);
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
        * The phone's start and more-actions sheets. Both rise from the bottom
        * edge, which is where the thumb already is.
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
              openScheduler();
              setShowMobileStartModal(false);
            }}
          >
            Schedule bake
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        title="More actions"
        placement="bottom"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2" role="group" aria-labelledby="mobile-share-label">
            <span id="mobile-share-label" className="ui-label">Share</span>
            {shareUrl ? (
              <>
                <Button size="lg" className="w-full" onClick={handleShareLink}>
                  {isFork ? 'Copy link to the original' : 'Copy link'}
                </Button>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowQrModal(true);
                  }}
                >
                  QR code
                </Button>
              </>
            ) : null}
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setShowMobileMenu(false);
                handleExportPDF();
              }}
            >
              Export PDF
            </Button>
          </div>
          {localRecipe ? (
          <div className="flex flex-col gap-2 border-t border-rule pt-5" role="group" aria-labelledby="mobile-recipe-label">
            <span id="mobile-recipe-label" className="ui-label">Recipe</span>
            <Button
              size="lg"
              className="w-full"
              engaged={localRecipe.tags?.includes('Favorite')}
              onClick={handleToggleFavorite}
              icon={<Star className={cn('h-4 w-4', localRecipe.tags?.includes('Favorite') && 'fill-current')} aria-hidden="true" />}
            >
              {localRecipe.tags?.includes('Favorite') ? 'Favorited' : 'Favorite'}
            </Button>
            <Link
              to={`/edit/${localRecipe._id}`}
              className={buttonClassName({ size: 'lg', className: 'w-full' })}
            >
              <Edit className="h-4 w-4" aria-hidden="true" /> Edit recipe
            </Link>
          </div>
          ) : null}
        </div>
      </Sheet>

      </div>

      {copyNotice ? (
        <div
          role="status"
          className="above-nav ui-label fixed left-1/2 z-[130] -translate-x-1/2 rounded-panel border border-rule bg-panel px-4 py-2 text-ink"
        >
          {copyNotice}
        </div>
      ) : null}

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
            <QRCodeSVG value={shareUrl ?? window.location.href} size={200} level="M" />
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

      {/* The exporter is full-screen on the ground colour, so its fallback is
        * that same empty ground with a skeleton of its preview, not a black
        * slab with the word "Loading" in it. */}
      {showInstagramExporter && localRecipe && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ground p-6" role="status" aria-label="Opening the exporter">
              <Skeleton className="aspect-square w-full max-w-sm" />
            </div>
          }
        >
          <InstagramExporter
            recipe={localRecipe}
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
