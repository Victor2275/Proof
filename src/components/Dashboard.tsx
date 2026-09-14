import { useState, useEffect } from 'react';
import RecipeImage from './RecipeImage';
import { SkeletonCard } from './ui/Skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { type Recipe } from '../lib/api';
import { useRecipes } from '../lib/queries';
import { Search, Clock, LayoutGrid, List, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import Fuse from 'fuse.js';
import OnboardingModal from './OnboardingModal';

const EMPTY_ARRAY: Recipe[] = [];

export default function Dashboard() {
  const { data: allRecipes = EMPTY_ARRAY, isLoading: loading, error, refetch } = useRecipes();
  const loadError = error instanceof Error ? error.message : null;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => localStorage.getItem('dashboardViewMode') as any || 'grid');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('hasVisited') === 'true' && !localStorage.getItem('hasSeenOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    let filtered = allRecipes;

    if (activeFilters.length > 0) {
      filtered = filtered.filter((recipe: Recipe) => 
        activeFilters.every(filter => recipe.tags?.map((t: string) => t.toLowerCase()).includes(filter.toLowerCase()))
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

  const allTags = Array.from(new Set(allRecipes.flatMap((r: Recipe) => (r.tags || []).map((t: string) => t.toLowerCase())))).sort() as string[];

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-border-subtle pb-6">
        <div className="flex flex-col gap-1 w-full xl:w-auto">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain md:hidden" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
              {activeFilters.length > 0 ? `#${activeFilters[0]}` : search ? `Search: ${search}` : 'All Recipes'}
            </h1>
          </div>
          <p className="text-ink-muted text-sm font-medium">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} found
          </p>
        </div>

        <div className="flex flex-wrap md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto flex-1 xl:flex-none">
          {recipes.length > 0 && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const random = recipes[Math.floor(Math.random() * recipes.length)];
                navigate(`/recipe/${random._id}`);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent/10 border border-accent/50 text-accent rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:bg-accent/20 transition-colors"
            >
              <Flame className="w-4 h-4" /> Inspire Me
            </motion.button>
          )}
        <div className="relative w-full min-w-[150px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input 
            type="text" 
            placeholder="Search recipes or tags..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border-subtle bg-sidebar/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
          />
        </div>
        <div className="hidden md:flex border border-border-subtle rounded-xl overflow-hidden bg-sidebar/50 p-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-black shadow-sm' : 'text-ink-muted hover:text-accent hover:bg-white/5'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-black shadow-sm' : 'text-ink-muted hover:text-accent hover:bg-white/5'}`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
          <button
            onClick={() => setActiveFilters([])}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all snap-start ${
              activeFilters.length === 0 ? 'bg-ink text-paper' : 'bg-black/5 dark:bg-white/5 text-ink-muted border border-border-subtle hover:text-ink'
            }`}
          >
            All Recipes
          </button>
          {allTags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => setActiveFilters([tag])}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all snap-start ${
                activeFilters.includes(tag) ? 'bg-accent text-black shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'bg-black/5 dark:bg-white/5 text-ink-muted border border-border-subtle hover:text-ink hover:border-ink/50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div>
        {loading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-24 border-2 border-dashed border-red-500/30 rounded-xl bg-red-500/5 px-6">
            <p className="font-bold text-lg mb-2">Couldn't load your cookbook</p>
            <p className="text-ink-muted mb-6 max-w-md mx-auto">{loadError}</p>
            <button
              onClick={() => refetch()}
              className="bg-ink text-paper px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border-subtle rounded-xl text-ink-muted bg-sidebar/50">
            <p className="mb-2">No recipes found.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {recipes.map((recipe) => (
              <div key={recipe._id}>
                <Link 
                  to={`/recipe/${recipe._id}`}
                  className={`group block bg-sidebar/50 backdrop-blur-sm border border-border-subtle rounded-2xl overflow-hidden hover:border-accent hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] dark:hover:shadow-[0_0_15px_rgba(197,160,89,0.15)] transition-all duration-300 ${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-start p-4 gap-4 sm:gap-6' : 'flex flex-col h-full'}`}
                >
                  {/* Image rendering based on viewMode */}
                  {viewMode === 'grid' && (
                    <div className="aspect-[4/3] shrink-0 bg-black/5 dark:bg-white/5 relative overflow-hidden">
                      <RecipeImage
                        src={recipe.imageUrls?.[0]}
                        alt={recipe.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        placeholderClassName="w-full h-full"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  <div className={`p-5 ${viewMode === 'list' ? 'flex-1 p-0 flex flex-col justify-between items-start gap-4' : 'flex-1 flex flex-col'}`}>
                    <div className="w-full">
                      <h2 className="text-xl font-bold tracking-tight mb-2 group-hover:text-accent transition-colors">{recipe.title}</h2>
                      {viewMode === 'grid' && <p className="text-ink-muted text-sm line-clamp-2 mb-4 leading-relaxed">{recipe.description}</p>}
                      
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {recipe.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] uppercase tracking-widest font-bold bg-black/5 dark:bg-white/10 px-2 py-1 rounded-sm text-ink-muted">
                              {tag}
                            </span>
                          ))}
                          {recipe.tags.length > 3 && (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-muted px-1 py-1">
                              +{recipe.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-ink-muted ${viewMode === 'list' ? 'mt-auto' : 'mt-auto pt-4 border-t border-border-subtle w-full'}`}>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
