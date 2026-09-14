import React from 'react';
import { Recipe } from '../lib/api';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface BasicInfoFormProps {
  recipe: Partial<Recipe>;
  setRecipe: (recipe: any) => void;
  uploading: boolean;
  handleNativeImageUpload: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenPastBakes: () => void;
  id?: string;
}

export default function BasicInfoForm({
  recipe,
  setRecipe,
  uploading,
  handleNativeImageUpload,
  handleImageUpload,
  handleOpenPastBakes,
  id
}: BasicInfoFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-wider border-l-4 border-ink pl-3">Basic Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5 text-ink-muted">Title</label>
          <input required type="text" value={recipe.title || ''} onChange={e => setRecipe({...recipe, title: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-ink" placeholder="e.g. 72-Hour Sourdough" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5 text-ink-muted">Description</label>
          <textarea value={recipe.description || ''} onChange={e => setRecipe({...recipe, description: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-ink resize-y" rows={4} placeholder="Brief overview or background of the recipe..." />
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
                      const newUrls = [...recipe.imageUrls!];
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
                  className="block w-full text-sm text-ink-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-sidebar/50 file:border file:border-border-subtle file:text-ink hover:file:border-accent hover:file:text-accent transition-all cursor-pointer focus:outline-none" 
                />
              )}
              <p className="text-xs text-ink-muted opacity-70 mt-2">JPEG, PNG, WEBP. Max 20MB per file.</p>
              {uploading && <p className="text-sm font-medium text-green-600 animate-pulse">Uploading...</p>}
              
              {id && (
                <button 
                  type="button" 
                  onClick={handleOpenPastBakes}
                  className="text-sm font-medium text-ink-muted hover:text-ink underline transition-colors"
                >
                  Select from Past Bakes
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-ink-muted">Prep Time (mins)</label>
          <input type="number" inputMode="decimal" value={recipe.prepTime || ''} onChange={e => setRecipe({...recipe, prepTime: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink" placeholder="30" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-ink-muted">Cook Time (mins)</label>
          <input type="number" inputMode="decimal" value={recipe.cookTime || ''} onChange={e => setRecipe({...recipe, cookTime: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink" placeholder="60" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-ink-muted">Servings</label>
          <input type="number" inputMode="decimal" value={recipe.servings || ''} onChange={e => setRecipe({...recipe, servings: parseInt(e.target.value)})} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink" placeholder="4" />
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
              if (val && !(recipe.tags || []).includes(val)) {
                setRecipe({...recipe, tags: [...(recipe.tags || []), val]});
              }
              e.currentTarget.value = '';
            }
          }} className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-ink mb-2" placeholder="e.g. Baking, Bread, Experimental" />
          <div className="flex flex-wrap gap-2">
            {(recipe.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-black/10 dark:bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
                {tag}
                <button type="button" onClick={() => setRecipe({...recipe, tags: (recipe.tags || []).filter(t => t !== tag)})} className="hover:text-red-500"><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
