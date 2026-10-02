import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type Recipe, type Component } from '../lib/api';
import {
  Trash2,
  Plus,
  X,
  GripVertical,
  Loader2,
  Download,
  Check,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
} from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import EditorHeader from './EditorHeader';
import BasicInfoForm from './BasicInfoForm';
import AIReviewSheet from './AIReviewSheet';
import { Panel, Button, Field, TextArea, Sheet, cn } from './ui';

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
 */

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [uploading, setUploading] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [showExtract, setShowExtract] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageRef = useRef<HTMLImageElement>(null);

  // Past bakes selection
  const [showPastBakesModal, setShowPastBakesModal] = useState(false);
  const [pastBakesLoading, setPastBakesLoading] = useState(false);
  const [pastBakePhotos, setPastBakePhotos] = useState<string[]>([]);

  // AI state
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [proposedRecipe, setProposedRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiError, setAiError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [recipe, setRecipe] = useState<Omit<Recipe, '_id'>>(() => {
    if (location.state?.recipe) {
      return location.state.recipe;
    }
    return {
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
    };
  });

  const [draggedIngredientIdx, setDraggedIngredientIdx] = useState<number | null>(null);
  const [draggedInstructionIdx, setDraggedInstructionIdx] = useState<number | null>(null);

  // Sub-recipe linking state
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [linkingStepIdx, setLinkingStepIdx] = useState<number | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => {
    api.getRecipes().then(setAvailableRecipes).catch(console.error);
  }, []);

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
    if (id) {
      api.getRecipe(id).then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = data;
        setRecipe(rest);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe.title.trim()) return;
    setSaveError('');
    setSaving(true);

    try {
      if (!id) {
        const created = await api.createRecipe(recipe);
        navigate(`/recipe/${created._id}`);
      } else {
        const updated = await api.updateRecipe(id, recipe);
        navigate(`/recipe/${updated._id}`);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Could not save the recipe. Nothing has been lost — try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setConfirmingDelete(false);
    try {
      await api.deleteRecipe(id);
      navigate('/');
    } catch (err: any) {
      setSaveError(err.message || 'Could not delete the recipe.');
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractUrl) return;
    setExtracting(true);
    setExtractError('');
    try {
      const data = await api.extractRecipe(extractUrl);
      setRecipe((prev) => ({ ...prev, ...data }));
      setExtractUrl('');
    } catch (err: any) {
      setExtractError(err.message || 'Could not read a recipe from that page.');
    } finally {
      setExtracting(false);
    }
  };

  const handleAIRestructure = async () => {
    setIsRestructuring(true);
    setAiError('');
    try {
      const recipeText = `
        Title: ${recipe.title}
        Description: ${recipe.description}
        Prep: ${recipe.prepTime}, Cook: ${recipe.cookTime}, Servings: ${recipe.servings}
        Tags: ${recipe.tags.join(', ')}
        Ingredients: ${recipe.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join('\n')}
        Instructions: ${recipe.instructions.join('\n')}
        Lab Notes / Raw Text: ${recipe.labNotes}
      `;

      const aiData = await api.restructureRecipe(recipeText);
      setProposedRecipe(aiData);
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
          if (!blob) return;
          const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
          const { imageUrl } = await api.uploadImage(file);
          setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), imageUrl] });
          setCropImageSrc('');
          setUploading(false);
        },
        'image/jpeg',
        0.95,
      );
    } catch (err: any) {
      setSaveError(err.message || 'That image could not be cropped and uploaded.');
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
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.${photo.format || 'jpg'}`, {
          type: `image/${photo.format || 'jpeg'}`,
        });

        const { imageUrl } = await api.uploadImage(file);
        setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), imageUrl] });
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
    setPastBakesLoading(true);
    try {
      const logs = await api.getRecipeBakeLogs(id);
      const urls: string[] = [];
      logs.forEach((log) => {
        if (log.images) log.images.forEach((i) => urls.push(i.url));
        if (log.imageUrls) log.imageUrls.forEach((u) => urls.push(u));
      });
      setPastBakePhotos(Array.from(new Set(urls)));
    } catch {
      setSaveError('Could not load the past bakes for this recipe.');
    } finally {
      setPastBakesLoading(false);
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

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto max-w-4xl pb-20">
      <EditorHeader
        id={id}
        title={recipe.title}
        ingredientCount={recipe.ingredients.length}
        stepCount={recipe.instructions.length}
        isRestructuring={isRestructuring}
        saving={saving}
        handleAIRestructure={handleAIRestructure}
        handleDelete={() => setConfirmingDelete(true)}
        onBack={() => navigate(-1)}
      />

      <div className="flex flex-col gap-6">
        {saveError ? (
          <p className="border border-fault bg-panel p-3 text-sm text-fault" role="alert">
            {saveError}
          </p>
        ) : null}

        {aiError ? (
          <p className="border border-fault bg-panel p-3 text-sm text-fault" role="alert">
            {aiError}
          </p>
        ) : null}

        {!id ? (
          <Panel
            title="Import from a URL"
            actions={
              <Button variant="ghost" onClick={() => setShowExtract(!showExtract)}>
                {showExtract ? 'Close' : 'Open'}
              </Button>
            }
          >
            {showExtract ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                  Paste a link from a food blog or recipe site and the fields below are filled in.
                </p>
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
                  <Button
                    onClick={handleExtract}
                    busy={extracting}
                    disabled={!extractUrl}
                    icon={<Download className="h-4 w-4" />}
                    className="sm:mb-0"
                  >
                    {extracting ? 'Reading' : 'Extract'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Start from a page on the web instead of a blank form.
              </p>
            )}
          </Panel>
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

        <Panel
          title={`Ingredients · ${recipe.ingredients.length}`}
          flush
          actions={
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setRecipe({
                  ...recipe,
                  ingredients: [...recipe.ingredients, { name: '', quantity: 0, unit: '' }],
                })
              }
            >
              Add row
            </Button>
          }
        >
          {recipe.ingredients.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">
              Nothing yet. Add a row, or paste the recipe into Lab notes and let Restructure read it.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={() => setDraggedIngredientIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleIngredientDrop(e, i)}
                  onDragEnd={() => setDraggedIngredientIdx(null)}
                  className={cn(
                    'flex flex-col gap-2 p-3 md:flex-row md:items-end',
                    draggedIngredientIdx === i && 'opacity-50',
                  )}
                >
                  {/*
                    * On a phone the quantity, the unit and the row's controls
                    * share one line and the ingredient name takes the next, so
                    * a row is two lines rather than five. Stacking every field
                    * turned a sixteen-ingredient recipe into a 3,800px scroll.
                    * `md:contents` dissolves the wrapper at desktop width, where
                    * the whole row fits on one line.
                    */}
                  <div className="flex items-end gap-2 md:contents">
                    <GripVertical
                      className="hidden h-4 w-4 shrink-0 cursor-move text-ink-muted md:mb-3.5 md:block"
                      aria-hidden="true"
                    />
                    <Field
                      label={`Quantity ${i + 1}`}
                      hideLabel
                      required
                      type="number"
                      inputMode="decimal"
                      step="any"
                      className="w-20 shrink-0 md:w-24"
                      value={ing.quantity || ''}
                      onChange={(e) => updateIngredient(i, 'quantity', parseFloat(e.target.value))}
                      placeholder="Qty"
                    />
                    <Field
                      label={`Unit ${i + 1}`}
                      hideLabel
                      required
                      // Real units are words, not symbols: the library has
                      // "juice of", "cm piece" and "to serve" in this column.
                      className="min-w-0 flex-1 md:w-32 md:flex-none"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      placeholder="Unit"
                    />
                  </div>

                  {/*
                    * The controls ride with the name rather than with the unit:
                    * three 44px targets beside a unit field left it about 60px
                    * wide, and this column holds words — "juice of", "cm piece",
                    * "clove crushed".
                    */}
                  <div className="flex items-end gap-2 md:contents">
                    <Field
                      label={`Ingredient ${i + 1}`}
                      hideLabel
                      required
                      className="min-w-0 flex-1"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                      placeholder="Ingredient name"
                    />
                    <div className="flex shrink-0 items-center md:hidden">
                      <Button
                        variant="ghost"
                        onClick={() => moveIngredient(i, -1)}
                        aria-label={`Move ingredient ${i + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveIngredient(i, 1)}
                        aria-label={`Move ingredient ${i + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => removeIngredient(i)}
                        aria-label={`Remove ingredient ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => removeIngredient(i)}
                    aria-label={`Remove ingredient ${i + 1}`}
                    className="hidden md:inline-flex"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={`Method · ${recipe.instructions.length}`}
          flush
          actions={
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] })}
            >
              Add step
            </Button>
          }
        >
          {recipe.instructions.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">
              No steps yet. The step row on the cookbook tile reads these, so the phases a recipe
              proves come from the words used here.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {recipe.instructions.map((step, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={() => setDraggedInstructionIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleInstructionDrop(e, i)}
                  onDragEnd={() => setDraggedInstructionIdx(null)}
                  className={cn('flex flex-col gap-2 p-3', draggedInstructionIdx === i && 'opacity-50')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        className="hidden h-4 w-4 shrink-0 cursor-move text-ink-muted md:block"
                        aria-hidden="true"
                      />
                      <span className="label-silkscreen text-ink">Step {i + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => moveInstruction(i, -1)}
                        aria-label={`Move step ${i + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveInstruction(i, 1)}
                        aria-label={`Move step ${i + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => removeInstruction(i)}
                        aria-label={`Remove step ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <TextArea
                    label={`Step ${i + 1} text`}
                    hideLabel
                    prose
                    required
                    rows={3}
                    value={step}
                    onChange={(e) => updateInstruction(i, e.target.value)}
                    placeholder="Describe step..."
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(recipe.instructionLinks || [])
                      .filter((l) => l.stepIndex === i)
                      .map((link, lidx) => (
                        <span
                          key={lidx}
                          className="label-silkscreen flex items-center gap-1.5 rounded-control border border-rule px-2 py-1 text-ink"
                        >
                          <LinkIcon className="h-3 w-3" aria-hidden="true" /> {link.recipeTitle}
                          <button
                            type="button"
                            onClick={() => removeSubRecipe(i, link.recipeId)}
                            aria-label={`Unlink ${link.recipeTitle} from step ${i + 1}`}
                            className="text-ink-muted transition-colors hover:text-ink"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    <Button variant="ghost" onClick={() => setLinkingStepIdx(i)}>
                      <Plus className="h-3 w-3" /> Link recipe
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Lab notes">
          <TextArea
            label="Lab notes and iterations"
            hideLabel
            rows={6}
            value={recipe.labNotes || ''}
            onChange={(e) => setRecipe({ ...recipe, labNotes: e.target.value })}
            placeholder="Used rosemary instead of thyme. Next time: half the salt."
            hint="Not shown while baking. Notes to yourself, and the raw text Restructure reads."
          />
        </Panel>
      </div>

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
                    className="w-full px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-panel-sunk"
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
              {uploading ? 'Uploading' : 'Crop and upload'}
            </Button>
          </>
        }
      >
        <div className="flex max-h-[55vh] justify-center overflow-hidden bg-panel-sunk">
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
        {pastBakesLoading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading photographs…</p>
          </div>
        ) : pastBakePhotos.length === 0 ? (
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
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isSelected ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-ground/70">
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

      <Sheet
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete recipe"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete “{recipe.title || 'this recipe'}”? Its bake logs stay, but the recipe itself cannot
          be recovered.
        </p>
      </Sheet>
    </form>
  );
}
