import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Component, Draft, Recipe } from '../lib/types';
import { repo } from '../lib/repo';
import { savePhoto } from '../lib/repo/photos';
import { useCreateRecipe, useDeleteRecipe, useRecipe, useRecipes, useRestoreRecord, useUpdateRecipe } from '../lib/queries';
import { useUndoableAction } from '../lib/useUndoableAction';
import { amountForField, parseAmount, parseIngredientBlock } from '../lib/parseIngredient';
import { cleanText, headnote, sectionHeading } from '../lib/recipeText';
import { printedSections } from '../lib/method';
import { factsLine } from '../lib/facts';
import { friendlyAmountText } from '../lib/quantities';
import { usePlan } from '../lib/session';
import {
  Trash2,
  Plus,
  X,
  GripVertical,
  Download,
  Check,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
  ScanText,
  Sparkles,
  Heading,
  MoreVertical,
} from 'lucide-react';
import { blobToDataUrl, compressImage } from '../lib/image';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import EditorHeader from './EditorHeader';
import BasicInfoForm from './BasicInfoForm';
import AIReviewSheet from './AIReviewSheet';
import AiGateSheet, { AiAllowance } from './AiGateSheet';
import { refreshAccount } from '../lib/useAccount';
import { Panel, Button, Disclosure, Field, Menu, MenuItem, Photo, TextArea, Sheet, buttonClassName, cn } from './ui';

/*
 * The recipe editor.
 *
 * The one Author surface in a product that is otherwise all Operate. It keeps
 * its single scroll — writing a recipe means moving between the ingredients
 * and the step that uses them constantly, and tabs would put a click between
 * them — but every section is a panel with a silkscreened head, and the bar at
 * the top reports what the recipe amounts to as it is typed.
 *
 * Its four overlays (AI review, sub-recipe link, crop, past bakes) were four
 * hand-rolled scrims. They are all `Sheet` now, which is where focus trapping,
 * Escape and the scroll lock come from.
 *
 * Editing an existing recipe never shows a form until the recipe is in it. It
 * used to render an empty "Untitled recipe" form, with live Save and Delete,
 * over a recipe it had failed to load; saving that wrote the blank over the
 * real one (audit #1).
 */

const BLANK: Draft<Recipe> = {
  title: '',
  description: '',
  imageUrls: [],
  servings: 4,
  difficulty: 'Medium',
  prepTime: '',
  cookTime: '',
  tags: [],
  ingredients: [],
  instructions: [],
  instructionLinks: [],
  labNotes: '',
  folder: 'Uncategorized',
};

/** The editable part of a stored recipe: everything but the record fields. */
function draftOf(recipe: Recipe): Draft<Recipe> {
  const { _id, createdAt, updatedAt, deletedAt, ...draft } = recipe;
  void _id; void createdAt; void updatedAt; void deletedAt;
  return draft;
}

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [uploading, setUploading] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [searchParams] = useSearchParams();
  // New → "Paste a link or text" opens the editor with the import already open.
  const [showExtract, setShowExtract] = useState(() => ['paste', 'photo'].includes(searchParams.get('start') ?? ''));
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageRef = useRef<HTMLImageElement>(null);

  // Past bakes selection
  const [showPastBakesModal, setShowPastBakesModal] = useState(false);
  const [pastBakePhotos, setPastBakePhotos] = useState<string[] | null>(null);
  const [aiGate, setAiGate] = useState<string | null>(null);
  const { can } = usePlan();
  const stored = useRecipe(id);
  const { data: availableRecipes = [] } = useRecipes();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  // AI state
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [proposedRecipe, setProposedRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiError, setAiError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const undoable = useUndoableAction();
  const restore = useRestoreRecord();

  const [recipe, setRecipe] = useState<Draft<Recipe>>(() => location.state?.recipe ?? BLANK);
  // The stored recipe is copied into the form once, when it arrives; after
  // that the form is the author's.
  const [hydrated, setHydrated] = useState(!id);

  const [draggedIngredientIdx, setDraggedIngredientIdx] = useState<number | null>(null);
  const [draggedInstructionIdx, setDraggedInstructionIdx] = useState<number | null>(null);

  // Sub-recipe linking state
  const [linkingStepIdx, setLinkingStepIdx] = useState<number | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  const handleIngredientDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIngredientIdx === null || draggedIngredientIdx === dropIdx) return;
    const newIngs = [...recipe.ingredients];
    const [removed] = newIngs.splice(draggedIngredientIdx, 1);
    newIngs.splice(dropIdx, 0, removed);
    setRecipe({ ...recipe, ingredients: newIngs });
    setDraggedIngredientIdx(null);
  };

  const handleInstructionDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedInstructionIdx === null || draggedInstructionIdx === dropIdx) return;
    const newInst = [...recipe.instructions];
    const [removed] = newInst.splice(draggedInstructionIdx, 1);
    newInst.splice(dropIdx, 0, removed);
    setRecipe({ ...recipe, instructions: newInst });
    // Reordering steps has to carry their links with them, or a sub-recipe
    // attached to "shape the boule" ends up attached to whatever took its place.
    const newLinks = (recipe.instructionLinks || []).map((link) => {
      if (link.stepIndex === draggedInstructionIdx) return { ...link, stepIndex: dropIdx };
      if (draggedInstructionIdx < dropIdx && link.stepIndex > draggedInstructionIdx && link.stepIndex <= dropIdx) {
        return { ...link, stepIndex: link.stepIndex - 1 };
      }
      if (draggedInstructionIdx > dropIdx && link.stepIndex >= dropIdx && link.stepIndex < draggedInstructionIdx) {
        return { ...link, stepIndex: link.stepIndex + 1 };
      }
      return link;
    });
    setRecipe((prev) => ({ ...prev, instructions: newInst, instructionLinks: newLinks }));
    setDraggedInstructionIdx(null);
  };

  useEffect(() => {
    if (id && !hydrated && stored.data) {
      setRecipe(draftOf(stored.data));
      setHydrated(true);
    }
  }, [id, hydrated, stored.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe.title.trim()) return;
    setSaveError('');
    setSaving(true);

    try {
      const saved = id
        ? await updateRecipe.mutateAsync({ id, data: recipe })
        : await createRecipe.mutateAsync(recipe);
      navigate(`/recipe/${saved._id}`);
    } catch (err) {
      setSaveError(
        `${err instanceof Error ? err.message : "Couldn't save the recipe to this device."} Nothing has been lost; try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete happens at once, with Undo (change 110): no question asked first.
  // Every line that is not a heading is a step, counted even while it is still blank.
  const stepNumbers = useMemo(() => {
    let n = 0;
    return recipe.instructions.map((line) => (sectionHeading(line) === null ? ++n : null));
  }, [recipe.instructions]);

  const handleDelete = () => {
    if (!id) return;
    void undoable({
      message: `${recipe.title || 'Recipe'} deleted`,
      run: async () => {
        await deleteRecipe.mutateAsync(id);
        navigate('/', { replace: true });
      },
      undo: () => restore.mutateAsync({ store: 'recipes', id }),
      failure: "Couldn't delete the recipe on this device. Try again.",
    });
  };

  /* "Paste a link or text": a block of text, tidied into the form by the AI. */
  const handlePastedText = async () => {
    if (!pastedText.trim()) return;
    if (!can('ai')) {
      setAiGate('Tidy pasted text');
      return;
    }
    setIsRestructuring(true);
    setAiError('');
    try {
      const data = await api.restructureRecipe(pastedText);
      setRecipe((prev) => ({ ...prev, ...data }));
      setPastedText('');
      void refreshAccount();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'The text could not be read into a recipe.');
    } finally {
      setIsRestructuring(false);
    }
  };

  /*
   * "Photograph a page": a cookbook page or a recipe card, photographed and
   * read into the form by the AI. The photograph is shrunk on the device
   * first, sent once, and kept nowhere.
   */
  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!can('ai')) {
      setAiGate('Photograph a page');
      return;
    }
    setReadingPhoto(true);
    setExtractError('');
    try {
      const { blob } = await compressImage(file);
      const data = await api.readRecipePhoto(await blobToDataUrl(blob));
      setRecipe((prev) => ({ ...prev, ...data }));
      void refreshAccount();
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Could not read a recipe from that photograph.');
    } finally {
      setReadingPhoto(false);
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractUrl) return;
    if (!can('ai')) {
      setAiGate('Import from a URL');
      return;
    }
    setExtracting(true);
    setExtractError('');
    try {
      const data = await api.extractRecipe(extractUrl);
      // The source travels with the recipe: publishing it later asks for credit (Phase 3).
      setRecipe((prev) => ({ ...prev, ...data, sourceUrl: data.sourceUrl || extractUrl }));
      setExtractUrl('');
      void refreshAccount();
    } catch (err: any) {
      setExtractError(err.message || 'Could not read a recipe from that page.');
    } finally {
      setExtracting(false);
    }
  };

  const handleAIRestructure = async () => {
    if (!can('ai')) {
      setAiGate('Restructure');
      return;
    }
    setIsRestructuring(true);
    setAiError('');
    try {
      const recipeText = `
        Title: ${recipe.title}
        Description: ${recipe.description}
        Prep: ${recipe.prepTime}, Cook: ${recipe.cookTime}, Servings: ${recipe.servings}
        Tags: ${recipe.tags.join(', ')}
        Ingredients: ${recipe.ingredients.map((i) => [i.quantity, i.unit, i.name].filter((x) => x !== null && x !== '').join(' ')).join('\n')}
        Instructions: ${recipe.instructions.join('\n')}
        Lab Notes / Raw Text: ${recipe.labNotes}
      `;

      const aiData = await api.restructureRecipe(recipeText);
      setProposedRecipe(aiData);
      void refreshAccount();
    } catch (err: any) {
      setAiError(err.message || 'The model could not be reached.');
    } finally {
      setIsRestructuring(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCrop(undefined);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const executeCropAndUpload = async () => {
    if (!completedCrop || !imageRef.current) return;
    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        imageRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height,
      );

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setSaveError("That photograph couldn't be cropped. Try another.");
            setUploading(false);
            return;
          }
          try {
            const ref = await savePhoto(blob);
            setRecipe((prev) => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ref] }));
            setCropImageSrc('');
          } catch {
            setSaveError("That photograph couldn't be saved to this device. The device may be out of space.");
          } finally {
            setUploading(false);
          }
        },
        'image/jpeg',
        0.95,
      );
    } catch {
      setSaveError("That photograph couldn't be cropped. Try another.");
      setUploading(false);
    }
  };

  const handleNativeImageUpload = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 90,
      });

      if (photo.webPath) {
        setUploading(true);
        const response = await fetch(photo.webPath);
        const ref = await savePhoto(await response.blob());
        setRecipe((prev) => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ref] }));
        setUploading(false);
      }
    } catch (e: any) {
      if (e.message !== 'User cancelled photos app') {
        setSaveError('Could not get a photograph from the camera.');
      }
      setUploading(false);
    }
  };

  const handleOpenPastBakes = async () => {
    if (!id) {
      setSaveError('Save the recipe first, and its past bakes become available here.');
      return;
    }
    setShowPastBakesModal(true);
    setPastBakePhotos(null);
    try {
      const logs = await repo.getRecipeBakeLogs(id);
      const urls: string[] = [];
      logs.forEach((log) => {
        if (log.images) log.images.forEach((i) => urls.push(i.url));
        if (log.imageUrls) log.imageUrls.forEach((u) => urls.push(u));
      });
      setPastBakePhotos(Array.from(new Set(urls)));
    } catch {
      setShowPastBakesModal(false);
      setSaveError("Couldn't read this recipe's past bakes on this device.");
    }
  };

  const updateIngredient = (index: number, field: keyof Component, value: any) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients.splice(index, 1);
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const moveIngredient = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= recipe.ingredients.length) return;
    const next = [...recipe.ingredients];
    [next[target], next[index]] = [next[index], next[target]];
    setRecipe({ ...recipe, ingredients: next });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInst = [...recipe.instructions];
    newInst[index] = value;
    setRecipe({ ...recipe, instructions: newInst });
  };

  const removeInstruction = (index: number) => {
    const newInst = [...recipe.instructions];
    newInst.splice(index, 1);
    const newLinks = (recipe.instructionLinks || [])
      .filter((l) => l.stepIndex !== index)
      .map((l) => (l.stepIndex > index ? { ...l, stepIndex: l.stepIndex - 1 } : l));
    setRecipe({ ...recipe, instructions: newInst, instructionLinks: newLinks });
  };

  const moveInstruction = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= recipe.instructions.length) return;
    const next = [...recipe.instructions];
    [next[target], next[index]] = [next[index], next[target]];
    const newLinks = (recipe.instructionLinks || []).map((link) => {
      if (link.stepIndex === index) return { ...link, stepIndex: target };
      if (link.stepIndex === target) return { ...link, stepIndex: index };
      return link;
    });
    setRecipe({ ...recipe, instructions: next, instructionLinks: newLinks });
  };

  const attachSubRecipe = (recipeId: string, recipeTitle: string) => {
    if (linkingStepIdx === null) return;
    const newLinks = [...(recipe.instructionLinks || [])];
    newLinks.push({ stepIndex: linkingStepIdx, recipeId, recipeTitle });
    setRecipe({ ...recipe, instructionLinks: newLinks });
    setLinkingStepIdx(null);
    setLinkSearch('');
  };

  const removeSubRecipe = (stepIndex: number, recipeId: string) => {
    const newLinks = (recipe.instructionLinks || []).filter(
      (l) => !(l.stepIndex === stepIndex && l.recipeId === recipeId),
    );
    setRecipe({ ...recipe, instructionLinks: newLinks });
  };

  // 203 recipes rendered as 203 buttons is a wall between the author and the
  // one they meant, so the list is searched and capped — the same reasoning the
  // grocery list's recipe bank already follows.
  const linkCandidates = availableRecipes
    .filter((r) => r._id !== id)
    .filter((r) => r.title.toLowerCase().includes(linkSearch.trim().toLowerCase()))
    .slice(0, 24);

  // No form until the recipe being edited is in it (audit #1). A read from the
  // device is near-instant, so the wait draws nothing (B30); a failure, or a
  // recipe that isn't here, says so and offers no Save and no Delete.
  if (id && !hydrated) {
    if (stored.isPending) return null;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
        <Panel title="Editor">
          <div className="flex flex-col gap-4" role="alert">
            <p className="font-title text-lg text-ink">
              {stored.isError ? "Couldn't open this recipe on this device" : 'This recipe is not in the cookbook'}
            </p>
            <p className="text-sm text-ink-muted">
              {stored.isError
                ? 'Nothing has been changed. Try again, or go back to the cookbook.'
                : 'It may have been deleted. There is nothing here to edit.'}
            </p>
            <div className="flex gap-2">
              {stored.isError ? <Button onClick={() => stored.refetch()}>Try again</Button> : null}
              <Link to="/" className={buttonClassName({ variant: 'ghost' })}>
                Back to the cookbook
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-[75rem] pb-20">
      <EditorHeader
        id={id}
        title={recipe.title}
        ingredientCount={recipe.ingredients.length}
        stepCount={stepNumbers.filter((n) => n !== null).length}
        isRestructuring={isRestructuring}
        saving={saving}
        handleAIRestructure={handleAIRestructure}
        handleDelete={handleDelete}
        backTo={id ? `/recipe/${id}` : '/'}
        backLabel={id ? 'Recipe' : 'Cookbook'}
      />

      {/* On a wide screen the form and the page it makes sit side by side (change 120). */}
      <div className="grid grid-cols-1 gap-x-12 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {saveError ? (
          <p className="rounded-control border border-fault p-3 text-sm text-fault" role="alert">
            {saveError}
          </p>
        ) : null}

        {aiError ? (
          <p className="rounded-control border border-fault p-3 text-sm text-fault" role="alert">
            {aiError}
          </p>
        ) : null}

        {/* A new recipe can start from somewhere else (change 117). */}
        {!id ? (
          <Disclosure
            open={showExtract}
            onOpenChange={setShowExtract}
            summary={<span className="font-title text-xl text-ink">Start from a link, text or a photograph</span>}
          >
            <div className="flex flex-col gap-4 pt-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field
                  label="Recipe URL"
                  type="url"
                  className="flex-1"
                  placeholder="https://www.allrecipes.com/..."
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  disabled={extracting}
                  error={extractError || undefined}
                />
                <Button onClick={handleExtract} busy={extracting} disabled={!extractUrl} icon={<Download className="h-4 w-4" aria-hidden="true" />}>
                  {extracting ? 'Reading' : 'Read the page'}
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <TextArea
                  label="Or paste the recipe's text"
                  prose
                  rows={3}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Copied from an email, a note, a message…"
                />
                <Button className="self-start" onClick={handlePastedText} busy={isRestructuring} disabled={!pastedText.trim()} icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}>
                  Tidy it into a recipe
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className={buttonClassName({ className: 'cursor-pointer' })} aria-busy={readingPhoto || undefined}>
                  <ScanText className="h-4 w-4" aria-hidden="true" />
                  {readingPhoto ? 'Reading the page' : 'Photograph a page'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={readingPhoto}
                    onChange={(e) => {
                      void handlePhoto(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="text-sm text-ink-muted">A cookbook page or a recipe card, read into the form.</span>
              </div>
              <AiAllowance />
            </div>
          </Disclosure>
        ) : null}

        <BasicInfoForm
          recipe={recipe}
          setRecipe={setRecipe}
          uploading={uploading}
          handleNativeImageUpload={handleNativeImageUpload}
          handleImageUpload={handleImageUpload}
          handleOpenPastBakes={handleOpenPastBakes}
          id={id}
        />

        <section aria-labelledby="edit-ingredients" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
            <h2 id="edit-ingredients" className="font-title text-xl text-ink">
              Ingredients
            </h2>
            <span className="text-sm text-ink-muted">Paste a whole list into a name and it splits into rows.</span>
          </div>
          {recipe.ingredients.length === 0 ? (
            <p className="py-2 text-sm text-ink-muted">Nothing yet. Add one, or paste a list.</p>
          ) : (
            <ul className="flex flex-col">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={() => setDraggedIngredientIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleIngredientDrop(e, i)}
                  onDragEnd={() => setDraggedIngredientIdx(null)}
                  className={cn('flex items-end gap-2 border-b border-rule py-2', draggedIngredientIdx === i && 'opacity-50')}
                >
                  <GripVertical className="mb-3.5 hidden h-4 w-4 shrink-0 cursor-move text-ink-muted md:block" aria-hidden="true" />
                  {/* Both optional: "Salt, to taste" has no amount, and "2 eggs" has no unit. */}
                  <AmountField
                    label={`Amount ${i + 1}`}
                    value={ing.quantity}
                    onChange={(q) => updateIngredient(i, 'quantity', q)}
                  />
                  <Field
                    label={`Unit ${i + 1}`}
                    hideLabel
                    className="w-20 shrink-0 sm:w-28"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                    placeholder="Unit"
                  />
                  <Field
                    label={`Ingredient ${i + 1}`}
                    hideLabel
                    required
                    className="min-w-0 flex-1"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                    onPaste={(e) => {
                      const rows = parseIngredientBlock(e.clipboardData.getData('text'));
                      if (!rows) return;
                      e.preventDefault();
                      const next = [...recipe.ingredients];
                      next.splice(i, 1, ...rows);
                      setRecipe({ ...recipe, ingredients: next });
                    }}
                    placeholder="Ingredient"
                  />
                  <RowMenu
                    label={`Ingredient ${i + 1}`}
                    onUp={() => moveIngredient(i, -1)}
                    onDown={() => moveIngredient(i, 1)}
                    onRemove={() => removeIngredient(i)}
                  />
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            className="self-start"
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { name: '', quantity: null, unit: '' }] })}
          >
            Add an ingredient
          </Button>
        </section>

        <section aria-labelledby="edit-method" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
            <h2 id="edit-method" className="font-title text-xl text-ink">
              Method
            </h2>
          </div>
          {recipe.instructions.length === 0 ? (
            <p className="py-2 text-sm text-ink-muted">No steps yet.</p>
          ) : (
            <ul className="flex flex-col">
              {recipe.instructions.map((step, i) => {
                const heading = sectionHeading(step);
                const number = stepNumbers[i] ?? i + 1;
                return (
                  <li
                    key={i}
                    draggable
                    onDragStart={() => setDraggedInstructionIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleInstructionDrop(e, i)}
                    onDragEnd={() => setDraggedInstructionIdx(null)}
                    className={cn('flex flex-col gap-2 border-b border-rule py-3', draggedInstructionIdx === i && 'opacity-50')}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-3 hidden h-4 w-4 shrink-0 cursor-move text-ink-muted md:block" aria-hidden="true" />
                      {heading !== null ? (
                        <Field
                          label={`Section heading, line ${i + 1}`}
                          className="min-w-0 flex-1"
                          value={heading}
                          onChange={(e) => updateInstruction(i, `--- ${e.target.value} ---`)}
                          hint="A heading for the steps that follow."
                        />
                      ) : (
                        <>
                          <span aria-hidden="true" className="font-title mt-2 w-6 shrink-0 text-lg text-ink-muted">
                            {number}
                          </span>
                          <TextArea
                            label={`Step ${number ?? i + 1} text`}
                            hideLabel
                            prose
                            required
                            rows={2}
                            className="min-w-0 flex-1"
                            value={step}
                            onChange={(e) => updateInstruction(i, e.target.value)}
                            placeholder="What to do"
                          />
                        </>
                      )}
                      <RowMenu
                        label={heading !== null ? `Heading “${heading}”` : `Step ${number}`}
                        onUp={() => moveInstruction(i, -1)}
                        onDown={() => moveInstruction(i, 1)}
                        onRemove={() => removeInstruction(i)}
                        onLink={heading !== null ? undefined : () => setLinkingStepIdx(i)}
                      />
                    </div>
                    {(recipe.instructionLinks || []).some((l) => l.stepIndex === i) ? (
                      <div className="ml-8 flex flex-wrap items-center gap-1.5">
                        {(recipe.instructionLinks || [])
                          .filter((l) => l.stepIndex === i)
                          .map((link, lidx) => (
                            <span key={lidx} className="flex items-center gap-1 rounded-full bg-paper-tonal py-0.5 pl-3 text-sm text-ink">
                              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              See also: {link.recipeTitle}
                              <button
                                type="button"
                                onClick={() => removeSubRecipe(i, link.recipeId)}
                                aria-label={`Unlink ${link.recipeTitle} from step ${number}`}
                                className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:text-ink"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] })}>
              Add a step
            </Button>
            <Button
              variant="ghost"
              icon={<Heading className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setRecipe({ ...recipe, instructions: [...recipe.instructions, '--- New section ---'] })}
            >
              Add a heading
            </Button>
          </div>
        </section>

        <section aria-labelledby="edit-notes" className="flex flex-col gap-2">
          <h2 id="edit-notes" className="font-title border-b border-rule pb-2 text-xl text-ink">
            Notes to yourself
          </h2>
          <TextArea
            label="Notes to yourself"
            hideLabel
            prose
            rows={3}
            value={recipe.labNotes || ''}
            onChange={(e) => setRecipe({ ...recipe, labNotes: e.target.value })}
            placeholder="Used rosemary instead of thyme. Next time: half the salt."
            hint="Not shown while cooking. Also the raw text that Tidy up with AI reads."
          />
        </section>
      </div>

      <aside aria-label="Preview" className="hidden xl:block">
        <div className="sticky top-20 flex max-h-[calc(100vh-7rem)] flex-col gap-3 overflow-y-auto rounded-sheet border border-rule bg-paper-raised p-5">
          <p className="ui-label">As it will read</p>
          <RecipePreview recipe={recipe} />
        </div>
      </aside>
      </div>

      <AiGateSheet open={aiGate !== null} feature={aiGate ?? ''} onClose={() => setAiGate(null)} />

      <AIReviewSheet
        open={proposedRecipe !== null}
        current={recipe}
        proposed={proposedRecipe}
        onClose={() => setProposedRecipe(null)}
        onApply={(accepted) => {
          setRecipe((prev) => ({ ...prev, ...accepted }));
          setProposedRecipe(null);
        }}
      />

      <Sheet
        open={linkingStepIdx !== null}
        onClose={() => {
          setLinkingStepIdx(null);
          setLinkSearch('');
        }}
        title={linkingStepIdx !== null ? `Link a recipe to step ${linkingStepIdx + 1}` : 'Link a recipe'}
        size="md"
        flush
      >
        <div className="flex flex-col">
          <div className="border-b border-rule p-4">
            <Field
              label="Search recipes"
              hideLabel
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search recipes…"
            />
          </div>
          {linkCandidates.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">No recipe matches that.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {linkCandidates.map((r) => (
                <li key={r._id}>
                  <button
                    type="button"
                    onClick={() => attachSubRecipe(r._id!, r.title)}
                    className="w-full px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-paper-sunk"
                  >
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      <Sheet
        open={cropImageSrc !== ''}
        onClose={() => setCropImageSrc('')}
        title="Crop the photograph"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCropImageSrc('')}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={executeCropAndUpload}
              disabled={!completedCrop}
              busy={uploading}
            >
              {uploading ? 'Saving' : 'Crop and save'}
            </Button>
          </>
        }
      >
        <div className="flex max-h-[55vh] justify-center overflow-hidden bg-paper-sunk">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
          >
            <img
              ref={imageRef}
              src={cropImageSrc}
              alt="The photograph being cropped"
              className="max-h-[55vh] w-auto object-contain"
            />
          </ReactCrop>
        </div>
      </Sheet>

      <Sheet
        open={showPastBakesModal}
        onClose={() => setShowPastBakesModal(false)}
        title="Photographs from past bakes"
        size="xl"
      >
        {pastBakePhotos === null ? null : pastBakePhotos.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            This recipe has no logged bakes with photographs yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pastBakePhotos.map((url, i) => {
              const isSelected = recipe.imageUrls?.includes(url);
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={isSelected}
                    aria-label={
                      isSelected ? `Photograph ${i + 1}, already used` : `Use photograph ${i + 1}`
                    }
                    onClick={() => {
                      setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), url] });
                      setShowPastBakesModal(false);
                    }}
                    className={cn(
                      'relative block aspect-square w-full overflow-hidden border transition-colors',
                      isSelected ? 'border-ink' : 'border-rule hover:border-ink-muted',
                    )}
                  >
                    <Photo
                      src={url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isSelected ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-paper/70">
                        <Check className="h-6 w-6 text-ink" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

    </form>
  );
}
/** An amount typed as a cook writes it ("1½", "2/3") and kept as a number. */
function AmountField({ label, value, onChange }: { label: string; value: number | null; onChange: (q: number | null) => void }) {
  const [text, setText] = useState(() => amountForField(value));
  const [focused, setFocused] = useState(false);
  // Follow the stored value when it changes from elsewhere (an import, Tidy up), not while typing.
  useEffect(() => {
    if (!focused) setText(amountForField(value));
  }, [value, focused]);
  return (
    <Field
      label={label}
      hideLabel
      inputMode="text"
      className="w-16 shrink-0 sm:w-20"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAmount(e.target.value));
      }}
      onBlur={() => {
        setFocused(false);
        setText(amountForField(parseAmount(text)));
      }}
      placeholder="Amt"
    />
  );
}

/** A row's controls in one ⋯: move, link a sub-recipe, remove. Keeps the row to its fields. */
function RowMenu({
  label,
  onUp,
  onDown,
  onRemove,
  onLink,
}: {
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onLink?: () => void;
}) {
  return (
    <Menu
      label={`${label} options`}
      align="right"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`${label}: move, link or remove`}
          className="pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-sunk hover:text-ink"
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    >
      <MenuItem onSelect={onUp}>
        <ArrowUp className="h-4 w-4" aria-hidden="true" /> Move up
      </MenuItem>
      <MenuItem onSelect={onDown}>
        <ArrowDown className="h-4 w-4" aria-hidden="true" /> Move down
      </MenuItem>
      {onLink ? (
        <MenuItem onSelect={onLink}>
          <LinkIcon className="h-4 w-4" aria-hidden="true" /> Link a recipe to it
        </MenuItem>
      ) : null}
      <MenuItem onSelect={onRemove}>
        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
      </MenuItem>
    </Menu>
  );
}

/** The live preview beside the form on a desktop: the recipe as the page will print it. */
function RecipePreview({ recipe }: { recipe: Draft<Recipe> }) {
  const sections = printedSections(recipe.instructions);
  return (
    <div className="flex flex-col gap-4">
      <p className="font-title text-2xl leading-tight text-ink">{recipe.title || 'Untitled recipe'}</p>
      {recipe.description ? <p className="font-prose italic text-ink-2">{headnote(recipe.description)}</p> : null}
      <p className="text-sm text-ink-muted">{factsLine(recipe)}</p>
      <div>
        <p className="font-title border-b border-rule pb-1 text-lg text-ink">Ingredients</p>
        <ul>
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex gap-3 border-b border-rule py-1.5 text-[0.9375rem]">
              <span className="w-16 shrink-0 font-semibold tabular-nums">{friendlyAmountText(ing.quantity, ing.unit)}</span>
              <span className="font-prose">{cleanText(ing.name)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-title border-b border-rule pb-1 text-lg text-ink">Method</p>
        {sections.map((s, si) => (
          <div key={si}>
            {s.heading ? <p className="font-title mt-2 italic text-ink-2">{s.heading}</p> : null}
            <ol>
              {s.steps.map((st) => (
                <li key={st.index} className="flex gap-2 py-1.5 text-[0.9375rem]">
                  <span className="font-title w-5 shrink-0 text-ink-muted">{st.number}</span>
                  <span className="font-prose">{st.text}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
