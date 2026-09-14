import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type Recipe, type Component } from '../lib/api';
import { Trash2, Plus, X, GripVertical, Loader2, Download, Check, ArrowUp, ArrowDown, Link as LinkIcon } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as Diff from 'diff';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import EditorHeader from './EditorHeader';
import BasicInfoForm from './BasicInfoForm';

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
  
  // AI State
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [proposedRecipe, setProposedRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiError, setAiError] = useState('');
  const [saveError, setSaveError] = useState('');
  
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
      labNotes: ''
    };
  });
  


  const [draggedIngredientIdx, setDraggedIngredientIdx] = useState<number | null>(null);
  const [draggedInstructionIdx, setDraggedInstructionIdx] = useState<number | null>(null);

  // Sub-Recipe Linking State
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [linkingStepIdx, setLinkingStepIdx] = useState<number | null>(null);

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
    setDraggedIngredientIdx(null);
  };

  useEffect(() => {
    if (id) {
      api.getRecipe(id).then(data => {
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

    if (!id) {
      // Create new recipe
      try {
        const created = await api.createRecipe(recipe);
        navigate(`/recipe/${created._id}`);
      } catch (err: any) {
        console.error(err);
        setSaveError(err.message || 'Failed to create recipe.');
      }
    } else {
      // Update existing recipe
      try {
        const updated = await api.updateRecipe(id, recipe);
        navigate(`/recipe/${updated._id}`);
      } catch (err: any) {
        console.error(err);
        setSaveError(err.message || 'Failed to save recipe.');
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
      try {
        await api.deleteRecipe(id);
        navigate('/');
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete recipe');
      }
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractUrl) return;
    setExtracting(true);
    setExtractError('');
    try {
      const data = await api.extractRecipe(extractUrl);
      setRecipe(prev => ({ ...prev, ...data }));
      setExtractUrl('');
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract recipe.');
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
        Ingredients: ${recipe.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`).join('\n')}
        Instructions: ${recipe.instructions.join('\n')}
        Lab Notes / Raw Text: ${recipe.labNotes}
      `;
      
      const aiData = await api.restructureRecipe(recipeText);
      setProposedRecipe(aiData);
    } catch (err: any) {
      setAiError(err.message || 'AI Restructure failed.');
    } finally {
      setIsRestructuring(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCrop(undefined); // Reset crop state
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
        completedCrop.height
      );

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        const { imageUrl } = await api.uploadImage(file);
        setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), imageUrl] });
        setCropImageSrc('');
        setUploading(false);
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      alert(err.message || 'Crop/Upload failed');
      setUploading(false);
    }
  };

  const handleNativeImageUpload = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 90
      });
      
      if (photo.webPath) {
        setUploading(true);
        // Fetch the blob from the capacitor webPath
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.${photo.format || 'jpg'}`, { type: `image/${photo.format || 'jpeg'}` });
        
        const { imageUrl } = await api.uploadImage(file);
        setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), imageUrl] });
        setUploading(false);
      }
    } catch (e: any) {
      if (e.message !== 'User cancelled photos app') {
        alert('Failed to get photo from camera');
      }
      setUploading(false);
    }
  };

  const handleOpenPastBakes = async () => {
    if (!id) return alert('Please save the recipe first to select photos from its past bakes.');
    setShowPastBakesModal(true);
    setPastBakesLoading(true);
    try {
      const logs = await api.getRecipeBakeLogs(id);
      const urls: string[] = [];
      logs.forEach(log => {
        if (log.images) log.images.forEach(i => urls.push(i.url));
        if (log.imageUrls) log.imageUrls.forEach(u => urls.push(u));
      });
      setPastBakePhotos(Array.from(new Set(urls))); // unique
    } catch (e) {
      alert('Failed to load past bakes');
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

  const updateInstruction = (index: number, value: string) => {
    const newInst = [...recipe.instructions];
    newInst[index] = value;
    setRecipe({ ...recipe, instructions: newInst });
  };
  const removeInstruction = (index: number) => {
    const newInst = [...recipe.instructions];
    newInst.splice(index, 1);
    const newLinks = (recipe.instructionLinks || [])
      .filter(l => l.stepIndex !== index)
      .map(l => l.stepIndex > index ? { ...l, stepIndex: l.stepIndex - 1 } : l);
    setRecipe({ ...recipe, instructions: newInst, instructionLinks: newLinks });
  };

  const attachSubRecipe = (recipeId: string, recipeTitle: string) => {
    if (linkingStepIdx === null) return;
    const newLinks = [...(recipe.instructionLinks || [])];
    newLinks.push({ stepIndex: linkingStepIdx, recipeId, recipeTitle });
    setRecipe({ ...recipe, instructionLinks: newLinks });
    setLinkingStepIdx(null);
  };

  const removeSubRecipe = (stepIndex: number, recipeId: string) => {
    const newLinks = (recipe.instructionLinks || []).filter(l => !(l.stepIndex === stepIndex && l.recipeId === recipeId));
    setRecipe({ ...recipe, instructionLinks: newLinks });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10 pb-20 relative">
      <EditorHeader 
        id={id}
        isRestructuring={isRestructuring}
        handleAIRestructure={handleAIRestructure}
        handleDelete={handleDelete}
        onBack={() => navigate(-1)}
      />


      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 font-medium">
          {saveError}
        </div>
      )}

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-8 font-medium">
          {aiError}
        </div>
      )}

      {proposedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-paper w-full h-full md:rounded-xl md:max-w-4xl shadow-2xl border-none md:border md:border-border-subtle flex flex-col md:max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-border-subtle flex justify-between items-center bg-purple-500/10">
              <div>
                <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">✨ AI Proposed Changes</h2>
                <p className="text-sm text-ink-muted">Review the Git-style diff below before accepting.</p>
              </div>
              <button type="button" onClick={() => setProposedRecipe(null)} className="text-ink-muted hover:text-ink"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-black/5 dark:bg-white/5 m-6 rounded-lg">
              <pre className="whitespace-pre-wrap">
                {Diff.diffLines(
                  JSON.stringify({
                    title: recipe.title, description: recipe.description, prepTime: recipe.prepTime, cookTime: recipe.cookTime, servings: recipe.servings, tags: recipe.tags, ingredients: recipe.ingredients, instructions: recipe.instructions
                  }, null, 2), 
                  JSON.stringify({
                    title: proposedRecipe.title || recipe.title, description: proposedRecipe.description || recipe.description, prepTime: proposedRecipe.prepTime || recipe.prepTime, cookTime: proposedRecipe.cookTime || recipe.cookTime, servings: proposedRecipe.servings || recipe.servings, tags: proposedRecipe.tags || recipe.tags, ingredients: proposedRecipe.ingredients || recipe.ingredients, instructions: proposedRecipe.instructions || recipe.instructions
                  }, null, 2)
                ).map((part, idx) => (
                  <span key={idx} className={part.added ? 'bg-green-500/20 text-green-700 dark:text-green-400 block px-2' : part.removed ? 'bg-red-500/20 text-red-700 dark:text-red-400 block line-through opacity-70 px-2' : 'block text-ink-muted px-2'}>
                    {part.added ? '+' : part.removed ? '-' : ' '} {part.value.replace(/\n$/, '')}
                  </span>
                ))}
              </pre>
            </div>

            <div className="p-6 border-t border-border-subtle flex justify-end gap-3 bg-black/5 dark:bg-white/5 rounded-b-xl">
              <button type="button" onClick={() => setProposedRecipe(null)} className="px-4 py-2 font-medium hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors">Reject</button>
              <button 
                type="button"
                onClick={() => {
                  setRecipe(prev => ({ 
                    ...prev, 
                    ...proposedRecipe, 
                    ingredients: proposedRecipe.ingredients || prev.ingredients, 
                    instructions: proposedRecipe.instructions || prev.instructions, 
                    tags: proposedRecipe.tags || prev.tags 
                  }));
                  setProposedRecipe(null);
                }} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Accept Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Recipe Selection Modal */}
      {linkingStepIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl w-full max-w-md shadow-2xl border border-border-subtle p-6 flex flex-col max-h-[80vh]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5"/> Link Sub-Recipe</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {availableRecipes.filter(r => r._id !== id).map(r => (
                <button
                  key={r._id}
                  onClick={() => attachSubRecipe(r._id!, r.title)}
                  className="w-full text-left p-3 rounded-lg border border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium"
                >
                  {r.title}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setLinkingStepIdx(null)} className="px-4 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-md">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!id && (
        <div className="mb-8">
          <button type="button" onClick={() => setShowExtract(!showExtract)} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors mb-2">
            <Download className="w-4 h-4" /> Import from URL {showExtract ? '(Close)' : ''}
          </button>
          
          {showExtract && (
            <div className="bg-sidebar p-6 rounded-xl border border-border-subtle shadow-sm animate-in slide-in-from-top-2">
              <p className="text-ink-muted text-sm mb-4">Paste a link from a food blog or recipe site to automatically fill out this form.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="url" 
                  placeholder="https://www.allrecipes.com/..."
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  disabled={extracting}
                  className="flex-1 px-3 py-2 border border-border-subtle bg-paper rounded-lg focus:outline-none focus:ring-2 focus:ring-ink"
                />
                <button 
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || !extractUrl}
                  className="bg-accent text-black px-6 py-2 rounded-xl font-bold hover:shadow-[0_0_10px_rgba(212,175,55,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
                </button>
              </div>
              {extractError && (
                <p className="text-red-500 text-sm mt-2 font-medium">{extractError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <BasicInfoForm 
        recipe={recipe}
        setRecipe={setRecipe}
        uploading={uploading}
        handleNativeImageUpload={handleNativeImageUpload}
        handleImageUpload={handleImageUpload}
        handleOpenPastBakes={handleOpenPastBakes}
        id={id}
      />

      {/* Ingredients */}
      <div className="space-y-6 pt-6 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wider border-l-4 border-ink pl-3">Ingredients</h2>
          <button type="button" onClick={() => setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { name: '', quantity: 0, unit: '' }] })} className="text-sm border border-border-subtle px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
        <div className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <div 
              key={i} 
              draggable
              onDragStart={() => setDraggedIngredientIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleIngredientDrop(e, i)}
              onDragEnd={() => setDraggedIngredientIdx(null)}
              className={`flex flex-col md:flex-row gap-2 md:items-center group p-3 border-b border-dashed border-border-subtle hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-move md:cursor-move ${draggedIngredientIdx === i ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between md:block items-center w-full md:w-auto">
                <GripVertical className="hidden md:block w-5 h-5 text-ink-muted/30" />
                <div className="flex md:hidden gap-2">
                  <button type="button" onClick={() => { if(i>0) { const a=[...recipe.ingredients]; [a[i-1],a[i]]=[a[i],a[i-1]]; setRecipe({...recipe,ingredients:a}) } }} className="p-1 hover:bg-black/10 rounded"><ArrowUp className="w-4 h-4"/></button>
                  <button type="button" onClick={() => { if(i<recipe.ingredients.length-1) { const a=[...recipe.ingredients]; [a[i+1],a[i]]=[a[i],a[i+1]]; setRecipe({...recipe,ingredients:a}) } }} className="p-1 hover:bg-black/10 rounded"><ArrowDown className="w-4 h-4"/></button>
                </div>
                <button type="button" onClick={() => removeIngredient(i)} className="md:hidden p-2 text-red-500 rounded-md bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2 w-full">
                <input required type="number" inputMode="decimal" step="any" value={ing.quantity || ''} onChange={e => updateIngredient(i, 'quantity', parseFloat(e.target.value))} placeholder="Qty" className="w-16 md:w-20 shrink-0 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded text-center cursor-text" />
                <div className="hidden md:block w-px h-6 bg-border-subtle"></div>
                <input required type="text" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="Unit" className="w-16 md:w-24 shrink-0 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded text-center cursor-text" />
                <div className="hidden md:block w-px h-6 bg-border-subtle"></div>
                <input required type="text" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient Name" className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded cursor-text" />
                <button type="button" onClick={() => removeIngredient(i)} className="hidden md:block p-2 text-ink-muted/50 hover:text-red-500 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-6 pt-6 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wider border-l-4 border-ink pl-3">Instructions</h2>
          <button type="button" onClick={() => setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] })} className="text-sm border border-border-subtle px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </div>
        <div className="space-y-4 border rounded-md p-4 border-border-subtle">
          {recipe.instructions.map((step, i) => (
            <div 
              key={i} 
              draggable
              onDragStart={() => setDraggedInstructionIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleInstructionDrop(e, i)}
              onDragEnd={() => setDraggedInstructionIdx(null)}
              className={`flex flex-col md:flex-row gap-3 md:items-start group md:cursor-move hover:bg-black/5 dark:hover:bg-white/5 p-3 rounded-lg transition-colors border-b md:border-0 border-dashed border-border-subtle ${draggedInstructionIdx === i ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-center w-full md:w-auto md:mt-3">
                <GripVertical className="hidden md:block w-5 h-5 text-ink-muted/30" />
                <span className="hidden md:block text-ink-muted font-bold w-6 text-right">{i+1}.</span>
                <div className="flex md:hidden items-center gap-2">
                  <span className="font-bold mr-2 text-ink-muted">Step {i+1}</span>
                  <button type="button" onClick={() => { if(i>0) { const a=[...recipe.instructions]; [a[i-1],a[i]]=[a[i],a[i-1]]; setRecipe({...recipe,instructions:a}) } }} className="p-1.5 bg-black/5 dark:bg-white/5 rounded-md"><ArrowUp className="w-4 h-4"/></button>
                  <button type="button" onClick={() => { if(i<recipe.instructions.length-1) { const a=[...recipe.instructions]; [a[i+1],a[i]]=[a[i],a[i+1]]; setRecipe({...recipe,instructions:a}) } }} className="p-1.5 bg-black/5 dark:bg-white/5 rounded-md"><ArrowDown className="w-4 h-4"/></button>
                </div>
                <button type="button" onClick={() => removeInstruction(i)} className="md:hidden p-2 text-red-500 rounded-md bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 w-full flex flex-col gap-2">
                <div className="flex gap-2">
                  <textarea required value={step} onChange={e => updateInstruction(i, e.target.value)} placeholder="Describe step..." className="flex-1 bg-black/5 dark:bg-white/5 md:bg-transparent border md:border-0 border-border-subtle rounded-md p-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ink resize-y cursor-text" />
                  <button type="button" onClick={() => removeInstruction(i)} className="hidden md:block p-2.5 text-ink-muted/50 hover:text-red-500 rounded-md transition-colors mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Linked Recipes */}
                <div className="flex flex-wrap gap-2 items-center px-1">
                  {(recipe.instructionLinks || []).filter(l => l.stepIndex === i).map((link, lidx) => (
                    <span key={lidx} className="flex items-center gap-1 bg-black/5 dark:bg-white/5 border border-border-subtle px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <LinkIcon className="w-3 h-3" /> {link.recipeTitle}
                      <button type="button" onClick={() => removeSubRecipe(i, link.recipeId)} className="ml-1 hover:text-red-500"><X className="w-3 h-3"/></button>
                    </span>
                  ))}
                  <button type="button" onClick={() => setLinkingStepIdx(i)} className="text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Link Recipe
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lab Notes */}
      <div className="space-y-6 pt-6 border-t border-border-subtle">
        <h2 className="text-xl font-bold uppercase tracking-wider border-l-4 border-ink pl-3">Lab Notes & Iterations</h2>
        <textarea 
          value={recipe.labNotes || ''} 
          onChange={e => setRecipe({...recipe, labNotes: e.target.value})} 
          className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ink resize-y" 
          rows={6} 
          placeholder="*Tweak:* Used rosemary instead of thyme." 
        />
      </div>
      
      {/* Cropping Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-paper p-6 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">Crop Image</h3>
            <div className="flex justify-center mb-6 overflow-hidden max-h-[50vh] bg-black/5 dark:bg-white/5 rounded-xl">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img 
                  ref={imageRef} 
                  src={cropImageSrc} 
                  alt="Crop me" 
                  className="max-h-[50vh] w-auto object-contain"
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setCropImageSrc('')} 
                className="px-6 py-3 font-medium text-ink-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={executeCropAndUpload}
                disabled={!completedCrop || uploading}
                className="px-6 py-3 font-bold bg-accent text-black rounded-xl hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crop & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Bakes Modal */}
      {showPastBakesModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper p-6 rounded-2xl shadow-2xl relative w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold uppercase tracking-tight">Select from Past Bakes</h3>
              <button onClick={() => setShowPastBakesModal(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {pastBakesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading photos...</p>
                </div>
              ) : pastBakePhotos.length === 0 ? (
                <div className="text-center py-12 text-ink-muted">
                  <p>No photos found in past bakes for this recipe.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {pastBakePhotos.map((url, i) => {
                    const isSelected = recipe.imageUrls?.includes(url);
                    return (
                      <button 
                        key={i} 
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            setRecipe({ ...recipe, imageUrls: [...(recipe.imageUrls || []), url] });
                            setShowPastBakesModal(false);
                          }
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-ink opacity-50' : 'border-transparent hover:border-border-subtle cursor-pointer'}`}
                      >
                        <img src={url} alt={`Past bake ${i+1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
