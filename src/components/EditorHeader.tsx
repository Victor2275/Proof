import React from 'react';
import { ArrowLeft, Loader2, Trash2, Save } from 'lucide-react';

interface EditorHeaderProps {
  id?: string;
  isRestructuring: boolean;
  handleAIRestructure: () => void;
  handleDelete: () => void;
  onBack: () => void;
}

export default function EditorHeader({
  id,
  isRestructuring,
  handleAIRestructure,
  handleDelete,
  onBack
}: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm flex flex-wrap items-center justify-between py-4 border-b border-border-subtle mb-6 -mx-4 px-4 md:mx-0 md:px-0">
      <button type="button" onClick={onBack} className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel & Back
      </button>
      
      <button 
        type="button" 
        onClick={handleAIRestructure} 
        disabled={isRestructuring}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold uppercase tracking-wider text-xs hover:bg-accent/20 hover:border-accent transition-all ml-4"
      >
        {isRestructuring ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ Restructure with AI'}
      </button>

      <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
        {id && (
          <button type="button" onClick={handleDelete} className="shrink-0 border border-red-500/50 text-red-500 px-3 md:px-4 py-2 rounded-xl font-bold hover:bg-red-500/10 flex items-center gap-2 transition-all">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
        {id ? (
          <>
            <button type="submit" className="shrink-0 border border-accent/50 text-accent px-3 md:px-6 py-2 rounded-xl font-bold hover:bg-accent/10 flex items-center gap-2 transition-all whitespace-nowrap">
              <Save className="w-4 h-4" /> Save Recipe
            </button>
          </>
        ) : (
          <button type="submit" className="shrink-0 border border-accent/50 text-accent px-4 md:px-6 py-2 rounded-xl font-bold hover:bg-accent/10 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] flex items-center gap-2 transition-all whitespace-nowrap">
            <Save className="w-4 h-4" /> Create Recipe
          </button>
        )}
      </div>
    </div>
  );
}
