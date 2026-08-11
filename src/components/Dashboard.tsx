import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Recipe } from '../lib/api';
import { Search, Clock, Shuffle, LayoutGrid, List, Filter, Folder } from 'lucide-react';
import Fuse from 'fuse.js';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

function DroppableFolder({ folder, activeFolder, onClick }: { folder: string, activeFolder: string, onClick: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: folder });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-2 rounded-lg border font-medium transition-all ${activeFolder === folder ? 'bg-ink text-paper border-ink' : isOver ? 'bg-ink/10 border-ink border-dashed' : 'bg-sidebar border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      <Folder className="w-4 h-4" /> {folder}
    </button>
  );
}

function DraggableRecipeCard({ recipe, children }: { recipe: Recipe, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: recipe._id || '' });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => localStorage.getItem('dashboardViewMode') as any || 'grid');
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const data = await api.getRecipes('');
        setAllRecipes(data);
        setRecipes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  useEffect(() => {
    let filtered = allRecipes;

    if (activeFilters.length > 0) {
      filtered = filtered.filter(recipe => 
        activeFilters.every(filter => recipe.tags?.map(t => t.toLowerCase()).includes(filter.toLowerCase()))
      );
    }

    if (search.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ['title', 'description', 'tags'],
        threshold: 0.3,
        ignoreLocation: true
      });
      filtered = fuse.search(search).map(result => result.item);
    }

    setRecipes(filtered);
  }, [search, activeFilters, allRecipes]);

  const allTags = Array.from(new Set(allRecipes.flatMap(r => (r.tags || []).map(t => t.toLowerCase())))).sort();
  const allFolders = Array.from(new Set(allRecipes.map(r => r.folder || 'Uncategorized'))).sort();
  const [activeFolder, setActiveFolder] = useState<string>('Uncategorized');

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id) {
      const recipeId = active.id as string;
      const folderName = over.id as string;
      
      const recipe = allRecipes.find(r => r._id === recipeId);
      if (recipe && (recipe.folder || 'Uncategorized') !== folderName) {
        setAllRecipes(prev => prev.map(r => r._id === recipeId ? { ...r, folder: folderName } : r));
        try {
          await api.updateRecipe(recipeId, { folder: folderName });
        } catch (err) {
          console.error("Failed to update folder", err);
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-subtle pb-6">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain md:hidden" />
            <h1 className="text-3xl font-bold tracking-tight uppercase">My Cookbook</h1>
          </div>
          {recipes.length > 0 && (
            <button 
              onClick={() => {
                const random = recipes[Math.floor(Math.random() * recipes.length)];
                navigate(`/recipe/${random._id}`);
              }}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md text-sm font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Shuffle className="w-4 h-4" /> Inspire Me
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {recipes.length > 0 && (
            <button 
              onClick={() => {
                const random = recipes[Math.floor(Math.random() * recipes.length)];
                navigate(`/recipe/${random._id}`);
              }}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md text-sm font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Shuffle className="w-4 h-4" /> Inspire Me
            </button>
          )}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input 
            type="text" 
            placeholder="Search recipes or tags..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border-subtle bg-sidebar rounded-md focus:outline-none focus:ring-1 focus:ring-ink transition-all"
          />
        </div>
        <div className="hidden md:flex border border-border-subtle rounded-md overflow-hidden bg-black/5 dark:bg-white/5 p-0.5">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-paper shadow-sm text-ink' : 'text-ink-muted hover:text-ink hover:bg-black/5'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-paper shadow-sm text-ink' : 'text-ink-muted hover:text-ink hover:bg-black/5'}`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-ink-muted mr-2" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${activeFilters.includes(tag) ? 'bg-ink text-paper border-ink' : 'bg-transparent border-border-subtle text-ink-muted hover:border-ink/50'}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        {allFolders.length > 0 && (
          <div className="flex flex-wrap gap-3 pb-2 border-b border-border-subtle">
            {allFolders.map(folder => (
              <DroppableFolder 
                key={folder} 
                folder={folder} 
                activeFolder={activeFolder} 
                onClick={() => setActiveFolder(folder)} 
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-ink-muted font-medium uppercase tracking-wide text-sm">
            Loading Cookbook...
          </div>
        ) : recipes.filter(r => (r.folder || 'Uncategorized') === activeFolder).length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border-subtle rounded-xl text-ink-muted bg-sidebar/50">
            <p className="mb-2">No recipes found in this folder.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {recipes.filter(r => (r.folder || 'Uncategorized') === activeFolder).map((recipe) => (
              <DraggableRecipeCard key={recipe._id} recipe={recipe}>
                <Link 
                  to={`/recipe/${recipe._id}`}
                  className={`group block bg-sidebar border border-border-subtle rounded-xl overflow-hidden hover:border-ink/30 transition-all ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col h-full'}`}
                >
                  {/* Image rendering based on viewMode */}
                  {viewMode === 'grid' && (
                    <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 relative overflow-hidden">
                      {recipe.imageUrls?.[0] ? (
                        <img 
                          src={recipe.imageUrls[0]} 
                          alt={recipe.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-muted/30">
                          <span className="font-bold uppercase tracking-widest text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`p-5 ${viewMode === 'list' ? 'flex-1 p-0 flex justify-between items-center' : 'flex-1 flex flex-col'}`}>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{recipe.title}</h2>
                      {viewMode === 'grid' && <p className="text-ink-muted text-sm line-clamp-2 mb-4 leading-relaxed flex-1">{recipe.description}</p>}
                    </div>
                    
                    <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-ink-muted ${viewMode === 'list' ? 'mb-0' : 'mt-auto pt-4 border-t border-border-subtle'}`}>
                      {recipe.prepTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{recipe.prepTime}</span>
                        </div>
                      )}
                      {recipe.difficulty && (
                        <div className="flex items-center gap-1.5">
                          <span>• {recipe.difficulty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </DraggableRecipeCard>
            ))}
          </div>
        )}
      </DndContext>
    </div>
  );
}
