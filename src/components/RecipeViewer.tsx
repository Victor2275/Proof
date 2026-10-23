import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarClock, Heart, MoreHorizontal, PencilLine, Share } from 'lucide-react';
import type { BakeLog, PublishedRecipe, Recipe, StepNote } from '../lib/types';
import { ApiError } from '../lib/api';
import {
  useCreateRecipe,
  useDeleteRecipe,
  usePublications,
  usePublishedRecipe,
  useRecipe,
  useRecipeBakeLogs,
  useRecipes,
  useForkPublished,
  useRestoreRecord,
  useUpdateRecipe,
} from '../lib/queries';
import { useOwnership } from '../lib/session';
import { useUndoableAction } from '../lib/useUndoableAction';
import { haptic } from '../lib/haptics';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { baseServings } from '../lib/facts';
import { ingredientsAsText, recipeAsText, systemShare } from '../lib/share';
import RecipeHeader from './RecipeHeader';
import IngredientList from './IngredientList';
import InstructionList from './InstructionList';
import { LastTimeCard, YourBakes } from './RecipeBakes';
import LogBakeSheet from './LogBakeSheet';
import BakeDetailSheet from './BakeDetailSheet';
import ShareSheet from './ShareSheet';
import PublishSheet from './PublishSheet';
import PhotoSlider from './PhotoSlider';
import RecipeDrawer from './RecipeDrawer';
import ReverseBakeScheduler from './ReverseBakeScheduler';
import SharedRecipeCommunity from './SharedRecipeCommunity';
import AISubstitutionsModal from './AISubstitutionsModal';
import NotFound from './NotFound';
import {
  BackButton,
  Button,
  Disclosure,
  DockedAction,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  buttonClassName,
  useToast,
} from './ui';

// html2canvas and jspdf (~780 kB) and the card exporter load only when used.
const InstagramExporter = lazy(() => import('./InstagramExporter'));

const EMPTY_LOGS: BakeLog[] = [];
const EMPTY_RECIPES: Recipe[] = [];

/*
 * A recipe, read like a page of a cookbook (UI overhaul Phase 3, changes 58–86).
 *
 * Top to bottom, in the order a cook uses it: the photograph and title, one
 * line of facts, what happened last time, Start cooking, the ingredients, the
 * method, and the bakes so far along the foot. On a desktop it opens into a
 * two-page spread — the photograph, facts and ingredients on the left page,
 * the method on the right — with the bakes across both.
 *
 * Two routes, one page (B4): /recipe/:id is a recipe in this cookbook, read
 * from the device, with its owner's controls and bakes. /r/:slug is one from
 * the shared cookbook, read from the server, whose one primary action is to
 * save it.
 */
export default function RecipeViewer() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const undoable = useUndoableAction();

  const localQuery = useRecipe(slug ? undefined : id);
  const sharedQuery = usePublishedRecipe(slug);
  const recipe = slug ? sharedQuery.data : localQuery.data;
  const { isMine } = useOwnership(recipe);
  const own = isMine ? (recipe as Recipe) : null;
  const { data: bakes = EMPTY_LOGS } = useRecipeBakeLogs(own ? id : undefined);
  const { data: myRecipes = EMPTY_RECIPES } = useRecipes();
  const { byLocalId } = usePublications();
  const updateRecipe = useUpdateRecipe();
  const createRecipe = useCreateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const restore = useRestoreRecord();
  const forkPublished = useForkPublished();

  const [servings, setServings] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<BakeLog | null>(null);
  const [openBakeId, setOpenBakeId] = useState<string | null>(null);
  const [freshBakeId, setFreshBakeId] = useState<string | undefined>();
  const [shareOpen, setShareOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [subRecipeId, setSubRecipeId] = useState<string | null>(null);
  const [substitute, setSubstitute] = useState<string | null>(null);
  const [cardFor, setCardFor] = useState<BakeLog | null | undefined>(undefined);
  const startRef = useRef<HTMLAnchorElement>(null);

  // A new recipe is a new page: its own servings, nothing ticked.
  useEffect(() => {
    setServings(null);
    setChecked({});
  }, [id, slug]);

  /*
   * Addresses that open something on arrival: ?makeId= a bake (from Bakes),
   * ?log=1 the log sheet (from Bakes → Log bake), ?logged= a bake just logged
   * in baking mode, whose stamp is pressed on as the page appears.
   */
  useEffect(() => {
    const makeId = params.get('makeId');
    const logged = params.get('logged');
    // The bakes are read from the device a moment after the recipe: wait for them.
    if (makeId && bakes.length === 0) return;
    if (makeId && bakes.some((b) => b._id === makeId)) {
      setOpenBakeId(makeId);
      if (params.get('export') === 'instagram') setCardFor(bakes.find((b) => b._id === makeId) ?? null);
    }
    if (logged) setFreshBakeId(logged);
    if (params.get('log') === '1' && own) setLogOpen(true);
    if (makeId || logged || params.get('log')) setParams({}, { replace: true });
    // `params` changes as soon as it is cleared; the bakes arriving is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bakes, own]);

  // The newest note on each step, pencilled in the margin of the method.
  const marginNotes = useMemo(() => {
    const map = new Map<number, StepNote>();
    for (const bake of bakes) for (const note of bake.stepNotes ?? []) if (!map.has(note.stepIndex)) map.set(note.stepIndex, note);
    return map;
  }, [bakes]);

  // "Then and now": the first photographed bake beside the latest.
  const photographed = useMemo(() => bakes.filter((b) => bakePhotoUrls(b).length > 0), [bakes]);

  if (slug ? sharedQuery.isPending : localQuery.isPending) {
    // Read from the device in milliseconds: nothing drawn rather than a flash
    // (B30). A shared recipe comes over the network and gets its skeleton.
    if (!slug) return null;
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-20" role="status" aria-label="Opening the recipe">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="-mx-4 aspect-[4/3] sm:mx-0" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const sharedGone = slug && sharedQuery.error instanceof ApiError && sharedQuery.error.status === 404;
  const failure = slug ? (sharedGone ? null : sharedQuery.error) : localQuery.error;
  if (failure) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 py-16" role="alert">
        <p className="font-title text-2xl text-ink">
          {slug ? "Couldn't open this shared recipe" : "Couldn't open this recipe on this device"}
        </p>
        <p className="text-ink-2">{failure instanceof Error ? failure.message : 'Something went wrong reading it.'}</p>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => (slug ? sharedQuery.refetch() : localQuery.refetch())}>Try again</Button>
          <Link to="/" className={buttonClassName({ variant: 'ghost' })}>
            Back to the cookbook
          </Link>
        </div>
      </div>
    );
  }
  if (!recipe) return <NotFound />;

  const base = baseServings(recipe);
  const shownServings = servings ?? base;
  const scale = shownServings / base;
  const favourite = own?.tags?.includes('Favorite') ?? false;
  const savedCopy = slug ? myRecipes.find((r) => r.forkedFrom?.publishedId === recipe._id) : undefined;
  const publication = own ? byLocalId.get(own._id) : undefined;
  const publicSlug = slug ?? (publication && !publication.unpublishedAt ? publication.slug : own?.forkedFrom?.slug);
  const shareUrl = publicSlug ? `${window.location.origin}/r/${publicSlug}` : null;
  const folder = recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : null;
  const back = slug
    ? { to: '/discover', label: 'Discover' }
    : { to: folder ? `/?chapter=${encodeURIComponent(folder)}` : '/', label: folder ?? 'Cookbook' };
  const openBake = bakes.find((b) => b._id === openBakeId) ?? null;
  const openBakeNumber = openBake ? bakes.length - bakes.indexOf(openBake) : undefined;

  const toggleFavourite = async () => {
    if (!own) return;
    haptic('light');
    const tags = own.tags ?? [];
    try {
      await updateRecipe.mutateAsync({
        id: own._id,
        data: { tags: favourite ? tags.filter((t) => t !== 'Favorite') : [...tags, 'Favorite'] },
      });
    } catch {
      toast.show({ message: "Couldn't save the favourite. Try again.", tone: 'fault' });
    }
  };

  const share = async () => {
    const outcome = await systemShare({
      title: recipe.title,
      text: shareUrl ? undefined : recipeAsText(recipe, scale),
      url: shareUrl ?? undefined,
    });
    if (outcome === 'unavailable') setShareOpen(true);
  };

  const copyIngredients = async () => {
    try {
      await navigator.clipboard.writeText(ingredientsAsText(recipe, scale));
      toast.show({ message: 'Ingredients copied' });
    } catch {
      toast.show({ message: "Couldn't reach the clipboard.", tone: 'fault' });
    }
  };

  const duplicate = async () => {
    if (!own) return;
    const { _id, createdAt, updatedAt, deletedAt, ...draft } = own;
    void _id; void createdAt; void updatedAt; void deletedAt;
    try {
      const copy = await createRecipe.mutateAsync({ ...draft, title: `${own.title} (copy)`, forkedFrom: own.forkedFrom ?? null });
      toast.show({ message: 'Duplicated' });
      navigate(`/recipe/${copy._id}`);
    } catch {
      toast.show({ message: "Couldn't duplicate the recipe on this device. Try again.", tone: 'fault' });
    }
  };

  const remove = () => {
    if (!own) return;
    const recipeId = own._id;
    void undoable({
      message: `${own.title} deleted`,
      run: async () => {
        await deleteRecipe.mutateAsync(recipeId);
        navigate(back.to, { replace: true });
      },
      undo: () => restore.mutateAsync({ store: 'recipes', id: recipeId }),
      failure: "Couldn't delete the recipe on this device. Try again.",
    });
  };

  const saveToCookbook = () => {
    forkPublished.mutate(recipe as PublishedRecipe, {
      onSuccess: (saved) => {
        haptic('success');
        navigate(`/recipe/${saved._id}`);
      },
      onError: (err) => toast.show({ message: err instanceof Error ? err.message : "That recipe couldn't be saved.", tone: 'fault' }),
    });
  };

  const exportPdf = async () => {
    const node = document.getElementById('recipe-export-node');
    if (!node) return;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#fbf7f0' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${recipe.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch {
      toast.show({ message: "Couldn't build the PDF. Try Print, and choose Save as PDF.", tone: 'fault' });
    }
  };

  const startCooking = (
    <Link
      ref={startRef}
      to={`/recipe/${recipe._id}/bake`}
      onClick={() => haptic('medium')}
      className={buttonClassName({ variant: 'primary', size: 'lg', className: 'flex-1' })}
    >
      Start cooking
    </Link>
  );

  return (
    <div className="@container mx-auto flex w-full max-w-[75rem] flex-col pb-10">
      {/* The nav bar: back to where this page belongs, and the recipe's few actions. */}
      <div className="flex min-h-11 items-center justify-between gap-2 py-1 md:pt-4" data-html2canvas-ignore="true">
        <BackButton to={back.to} label={back.label} />
        <div role="toolbar" aria-label="Recipe actions" className="flex items-center">
          {own ? (
            <IconButton
              label={favourite ? 'Favourite' : 'Add to favourites'}
              pressed={favourite}
              onClick={toggleFavourite}
              icon={<Heart className="h-[22px] w-[22px]" strokeWidth={1.7} fill={favourite ? 'currentColor' : 'none'} aria-hidden="true" />}
            />
          ) : null}
          <IconButton label="Share" onClick={share} icon={<Share className="h-[22px] w-[22px]" strokeWidth={1.7} aria-hidden="true" />} />
          {own ? (
            <Link
              to={`/edit/${own._id}`}
              aria-label="Edit"
              title="Edit"
              className="pressable hidden h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-sunk md:inline-flex"
            >
              <PencilLine className="h-[22px] w-[22px]" strokeWidth={1.7} aria-hidden="true" />
            </Link>
          ) : null}
          <Menu
            label="More actions"
            align="right"
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label="More actions"
                className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-sunk"
              >
                <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
              </button>
            )}
          >
            {own ? <MenuItem to={`/edit/${own._id}`}>Edit</MenuItem> : null}
            {own ? <MenuItem onSelect={() => setPlanOpen(true)}>Plan this bake</MenuItem> : null}
            <MenuItem onSelect={copyIngredients}>Copy ingredients</MenuItem>
            <MenuItem onSelect={() => window.print()}>Print</MenuItem>
            <MenuItem onSelect={exportPdf}>Save as PDF</MenuItem>
            {own ? <MenuItem onSelect={() => setCardFor(null)}>Share as a card</MenuItem> : null}
            {own ? <MenuItem onSelect={duplicate}>Duplicate</MenuItem> : null}
            {own ? <MenuItem onSelect={remove}>Delete</MenuItem> : null}
          </Menu>
        </div>
      </div>

      <div id="recipe-export-node" className="bg-paper">
        <div className="grid grid-cols-1 gap-x-16 gap-y-8 @4xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          {/* The left page. */}
          <div className="flex min-w-0 flex-col gap-6">
            <RecipeHeader recipe={recipe} ownRecipe={own} onPublish={own ? () => setPublishOpen(true) : undefined} />

            {own ? <LastTimeCard recipeId={own._id} bakes={bakes} /> : null}

            {own ? (
              <div className="flex flex-col gap-2" data-html2canvas-ignore="true">
                <div className="flex gap-2.5">
                  {startCooking}
                  <Button size="lg" onClick={() => setLogOpen(true)} aria-haspopup="dialog">
                    Log a bake
                  </Button>
                </div>
                <Disclosure
                  open={planOpen}
                  onOpenChange={setPlanOpen}
                  summary={
                    <span className="flex items-center gap-2 text-ink-2">
                      <CalendarClock className="h-[18px] w-[18px]" aria-hidden="true" />
                      Plan this bake: eat at a time, see when to start
                    </span>
                  }
                >
                  <div className="pt-2">
                    <ReverseBakeScheduler recipe={own} onClose={() => setPlanOpen(false)} />
                  </div>
                </Disclosure>
              </div>
            ) : (
              /* A shared recipe's one primary action: make it yours. */
              <div className="flex flex-col gap-2" data-html2canvas-ignore="true">
                {savedCopy ? (
                  <>
                    <p className="text-sm text-ink-muted">Already in your cookbook.</p>
                    <Link to={`/recipe/${savedCopy._id}`} className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
                      Open my copy
                    </Link>
                  </>
                ) : (
                  <>
                    <Button variant="primary" size="lg" busy={forkPublished.isPending} onClick={saveToCookbook}>
                      Save to my cookbook
                    </Button>
                    <p className="text-sm text-ink-muted">Save it to cook it, log your bakes and change it. No account needed.</p>
                  </>
                )}
              </div>
            )}

            <IngredientList
              recipe={recipe}
              servings={shownServings}
              onServingsChange={setServings}
              checked={checked}
              onToggle={(i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
              onSubstitute={setSubstitute}
            />
          </div>

          {/* The right page. */}
          <div className="min-w-0">
            <InstructionList recipe={recipe} marginNotes={marginNotes} onOpenSubRecipe={setSubRecipeId} />
          </div>
        </div>
      </div>

      {own ? (
        <div className="mt-10 flex flex-col gap-6" data-html2canvas-ignore="true">
          <YourBakes
            bakes={bakes}
            onOpen={(log) => setOpenBakeId(log._id)}
            onLog={() => setLogOpen(true)}
            freshId={freshBakeId}
          />
          {photographed.length >= 2 ? (
            <Disclosure summary="Then and now: your first bake beside your latest">
              <PhotoSlider
                className="max-w-md pt-2"
                beforeUrl={bakePhotoUrls(photographed[photographed.length - 1])[0]}
                afterUrl={bakePhotoUrls(photographed[0])[0]}
                beforeLabel={`First · ${new Date(photographed[photographed.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                afterLabel={`Latest · ${new Date(photographed[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              />
            </Disclosure>
          ) : null}
        </div>
      ) : null}

      {slug && !own ? (
        <div className="mt-10">
          <SharedRecipeCommunity recipe={recipe as PublishedRecipe} />
        </div>
      ) : null}

      {/* Start cooking, kept under the thumb once the original scrolls away. */}
      {own ? (
        <DockedAction watch={startRef}>
          <span className="font-title min-w-0 flex-1 truncate text-base text-ink">{recipe.title}</span>
          <Link
            to={`/recipe/${recipe._id}/bake`}
            tabIndex={-1}
            onClick={() => haptic('medium')}
            className={buttonClassName({ variant: 'primary' })}
          >
            Start cooking
          </Link>
        </DockedAction>
      ) : null}

      {own ? (
        <>
          <LogBakeSheet
            open={logOpen || editing !== null}
            onClose={() => {
              setLogOpen(false);
              setEditing(null);
            }}
            recipe={own}
            log={editing ?? undefined}
            onSaved={(log) => {
              if (log.isPersonalBest) setFreshBakeId(log._id);
            }}
          />
          <BakeDetailSheet
            log={openBake}
            number={openBakeNumber}
            recipe={own}
            onClose={() => setOpenBakeId(null)}
            onEdit={(log) => {
              setOpenBakeId(null);
              setEditing(log);
            }}
            onShareCard={(log) => {
              setOpenBakeId(null);
              setCardFor(log);
            }}
          />
          <PublishSheet open={publishOpen} onClose={() => setPublishOpen(false)} recipe={own} publication={publication} />
        </>
      ) : null}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={recipe.title}
        url={shareUrl}
        text={recipeAsText(recipe, scale)}
        onPdf={exportPdf}
        onPublish={
          own
            ? () => {
                setShareOpen(false);
                setPublishOpen(true);
              }
            : undefined
        }
      />

      <RecipeDrawer isOpen={!!subRecipeId} onClose={() => setSubRecipeId(null)} recipeId={subRecipeId ?? ''} />

      {substitute ? (
        <AISubstitutionsModal ingredientName={substitute} recipeTitle={recipe.title} onClose={() => setSubstitute(null)} />
      ) : null}

      {cardFor !== undefined && own ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper p-6" role="status" aria-label="Opening the card">
              <Skeleton className="aspect-square w-full max-w-sm" />
            </div>
          }
        >
          <InstagramExporter recipe={own} bakeLog={cardFor ?? undefined} onClose={() => setCardFor(undefined)} />
        </Suspense>
      ) : null}

      {/* Where this page was opened from, for a screen reader: the trail the back button stands for. */}
      <nav aria-label="Breadcrumb" className="sr-only">
        <ol>
          <li>{slug ? 'Discover' : 'Cookbook'}</li>
          {folder && !slug ? <li>{folder}</li> : null}
          <li aria-current="page">{recipe.title}</li>
        </ol>
      </nav>
    </div>
  );
}
