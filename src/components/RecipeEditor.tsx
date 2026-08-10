import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, type Recipe, type Component } from '../lib/api';
import { ArrowLeft, Trash2, Save, Plus, X, GripVertical, Loader2, Download, Check, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as Diff from 'diff';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [uploading, setUploading] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  
  // Cropping State
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageRef = useRef<HTMLImageElement>(null);
  
  // AI State
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [proposedRecipe, setProposedRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiError, setAiError] = useState('');
  const [saveError, setSaveError] = useState('');
  
  // Versioning States
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
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
      labNotes: ''
    };
  });

  const [draggedIngredientIdx, setDraggedIngredientIdx] = useState<number | null>(null);
  const [draggedInstructionIdx, setDraggedInstructionIdx] = useState<number | null>(null);

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

  const handleSubmit = async (e: React.FormEvent, isCommit = false) => {
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
        if (isCommit) {
          const createdVersion = await api.createRecipeVersion(id, { ...recipe, commitMessage });
          navigate(`/recipe/${createdVersion._id}`);
        } else {
          const updated = await api.updateRecipe(id, recipe);
          navigate(`/recipe/${updated._id}`);
        }
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
      } catch (err) {
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
      setHighlightMissing(true);
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
      setHighlightMissing(false);
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
        setRecipe(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), imageUrl] }));
      }
    } catch (err: any) {
      console.error("Camera error:", err);
    } finally {
      setUploading(false);
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
    setRecipe({ ...recipe, instructions: newInst });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10 pb-20 relative">
      <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm flex flex-wrap items-center justify-between py-4 border-b border-border-subtle mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel & Back
        </button>
        
        <button 
          type="button" 
          onClick={handleAIRestructure} 
          disabled={isRestructuring}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider text-xs hover:bg-purple-500/20 transition-all ml-4"
        >
          {isRestructuring ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ Restructure with AI'}
        </button>

        <div className="flex items-center gap-3">
          {id && (
            <button type="button" onClick={handleDelete} className="border border-red-600/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-md font-medium hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 shadow-sm transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          {id ? (
            <>
              <button type="submit" onClick={(e) => handleSubmit(e, false)} className="border border-green-600/30 text-green-700 dark:text-green-400 px-6 py-2 rounded-md font-medium hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 shadow-sm transition-colors">
                <Save className="w-4 h-4" /> Quick Save
              </button>
              <button type="button" onClick={() => setShowCommitModal(true)} className="bg-ink text-paper px-6 py-2 rounded-md font-medium hover:opacity-90 flex items-center gap-2 shadow-sm transition-colors">
                Save as New Iteration
              </button>
            </>
          ) : (
            <button type="submit" onClick={(e) => handleSubmit(e, false)} className="border border-green-600/30 text-green-700 dark:text-green-400 px-6 py-2 rounded-md font-medium hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 shadow-sm transition-colors">
              <Save className="w-4 h-4" /> Create Recipe
            </button>
          )}
        </div>
      </div>

      {showCommitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl w-full max-w-md shadow-2xl border border-border-subtle p-6">
            <h2 className="text-xl font-bold mb-2">New Iteration</h2>
            <p className="text-sm text-ink-muted mb-4">Briefly describe what you changed in this version (e.g. "Increased hydration", "Baked at higher temp").</p>
            <input 
              type="text" 
              value={commitMessage} 
              onChange={(e) => setCommitMessage(e.target.value)} 
              placeholder="Commit Message..." 
              className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 mb-6 focus:outline-none focus:ring-1 focus:ring-ink"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCommitModal(false)} className="px-4 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-md">Cancel</button>
              <button type="button" onClick={(e) => { setShowCommitModal(false); handleSubmit(e, true); }} className="bg-ink text-paper px-6 py-2 font-medium rounded-md hover:opacity-90">Save Iteration</button>
            </div>
          </div>
        </div>
      )}

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
                  className="bg-ink text-paper px-6 py-2 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* Basic Info */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold uppercase tracking-wider border-l-4 border-ink pl-3">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Title</label>
            <input required type="text" value={recipe.title} onChange={e => setRecipe({...recipe, title: e.target.value})} className={`w-full bg-black/5 dark:bg-white/5 border ${highlightMissing && !recipe.title ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,1)]' : 'border-border-subtle'} rounded-md p-3 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-ink`} placeholder="e.g. 72-Hour Sourdough" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Description</label>
            <textarea value={recipe.description} onChange={e => setRecipe({...recipe, description: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-ink" rows={2} placeholder="Brief overview or background of the recipe..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Recipe Photos</label>
            <div className="flex flex-col gap-6">
              {recipe.imageUrls && recipe.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {recipe.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-32 h-32 bg-black/5 rounded-md overflow-hidden group border border-border-subtle shrink-0">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => {
                        const newUrls = [...recipe.imageUrls];
                        newUrls.splice(idx, 1);
                        setRecipe({...recipe, imageUrls: newUrls});
                      }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-medium">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 space-y-3">
                {Capacitor.isNativePlatform() ? (
                  <button 
                    type="button" 
                    onClick={handleNativeImageUpload}
                    disabled={uploading}
                    className="w-16 h-16 bg-border-subtle text-ink rounded-xl font-semibold hover:opacity-80 transition-all flex items-center justify-center shrink-0 shadow-sm"
                  >
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
                  </button>
                ) : (
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-ink-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-border-subtle file:text-ink hover:file:opacity-80 transition-all cursor-pointer focus:outline-none" 
                  />
                )}
                <p className="text-xs text-ink-muted opacity-70 mt-2">JPEG, PNG, WEBP. Max 20MB per file.</p>
                {uploading && <p className="text-sm font-medium text-green-600 animate-pulse">Uploading...</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Prep Time (mins)</label>
            <input type="number" inputMode="decimal" value={recipe.prepTime} onChange={e => setRecipe({...recipe, prepTime: e.target.value})} className={`w-full bg-black/5 dark:bg-white/5 border ${highlightMissing && !recipe.prepTime ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,1)]' : 'border-border-subtle'} rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink`} placeholder="30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Cook Time (mins)</label>
            <input type="number" inputMode="decimal" value={recipe.cookTime} onChange={e => setRecipe({...recipe, cookTime: e.target.value})} className={`w-full bg-black/5 dark:bg-white/5 border ${highlightMissing && !recipe.cookTime ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,1)]' : 'border-border-subtle'} rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink`} placeholder="60" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Servings</label>
            <input type="number" inputMode="decimal" value={recipe.servings || ''} onChange={e => setRecipe({...recipe, servings: parseInt(e.target.value)})} className={`w-full bg-black/5 dark:bg-white/5 border ${highlightMissing && !recipe.servings ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,1)]' : 'border-border-subtle'} rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink`} placeholder="4" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5 text-ink-muted">Difficulty</label>
              <select value={recipe.difficulty || 'Medium'} onChange={e => setRecipe({...recipe, difficulty: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-ink-muted">Tags (Press enter to add)</label>
            <input type="text" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val && !recipe.tags.includes(val)) {
                  setRecipe({...recipe, tags: [...recipe.tags, val]});
                }
                e.currentTarget.value = '';
              }
            }} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink mb-2" placeholder="e.g. Baking, Bread, Experimental" />
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-black/10 dark:bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
                  {tag}
                  <button type="button" onClick={() => setRecipe({...recipe, tags: recipe.tags.filter(t => t !== tag)})} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className={`space-y-6 pt-6 border-t ${highlightMissing && recipe.ingredients.length === 0 ? 'border-red-500 border-2 rounded-lg p-4' : 'border-border-subtle'}`}>
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
                <input required type="number" inputMode="decimal" step="any" value={ing.quantity || ''} onChange={e => updateIngredient(i, 'quantity', parseFloat(e.target.value))} placeholder="Qty" className="w-20 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded text-center cursor-text" />
                <div className="hidden md:block w-px h-6 bg-border-subtle"></div>
                <input required type="text" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="Unit" className="w-24 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded text-center cursor-text" />
                <div className="hidden md:block w-px h-6 bg-border-subtle"></div>
                <input required type="text" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient Name" className="flex-1 bg-black/5 dark:bg-white/5 md:bg-transparent border-0 focus:ring-1 focus:ring-ink p-2 rounded cursor-text" />
                <button type="button" onClick={() => removeIngredient(i)} className="hidden md:block p-2 text-ink-muted/50 hover:text-red-500 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className={`space-y-6 pt-6 border-t ${highlightMissing && recipe.instructions.length === 0 ? 'border-red-500 border-2 rounded-lg p-4' : 'border-border-subtle'}`}>
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
              
              <div className="flex-1 w-full flex gap-2">
                <textarea required value={step} onChange={e => updateInstruction(i, e.target.value)} placeholder="Describe step..." className="flex-1 bg-black/5 dark:bg-white/5 md:bg-transparent border md:border-0 border-border-subtle rounded-md p-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ink resize-y cursor-text" />
                <button type="button" onClick={() => removeInstruction(i)} className="hidden md:block p-2.5 text-ink-muted/50 hover:text-red-500 rounded-md transition-colors mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
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
                className="px-6 py-3 font-bold bg-ink text-paper rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crop & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
