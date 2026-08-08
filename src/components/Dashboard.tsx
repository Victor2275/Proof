import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type Recipe } from '../lib/api';
import { Search, Clock, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const data = await api.getRecipes(search);
        setRecipes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchRecipes, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-subtle pb-6">
        <h1 className="text-3xl font-bold tracking-tight uppercase">My Cookbook</h1>
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
      </div>

      {loading ? (
        <div className="text-ink-muted flex items-center justify-center py-20 font-medium tracking-wide uppercase text-sm">
          Loading Library...
        </div>
      ) : recipes.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-border-subtle rounded-xl text-center text-ink-muted bg-sidebar/50">
          No recipes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <Link 
              key={recipe._id} 
              to={`/recipe/${recipe._id}`}
              className="group block border border-border-subtle bg-sidebar/50 rounded-xl p-6 hover:shadow-md hover:border-ink/20 transition-all flex flex-col h-full overflow-hidden relative"
            >
              {recipe.imageUrls && recipe.imageUrls.length > 0 ? (
                <div className="w-full h-40 -mx-6 -mt-6 mb-4 bg-border-subtle overflow-hidden">
                  <img src={recipe.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="w-full h-40 -mx-6 -mt-6 mb-4 bg-black/5 dark:bg-white/5 border-b border-border-subtle flex items-center justify-center text-ink-muted uppercase tracking-wider text-xs">
                  No Image
                </div>
              )}
              <h2 className="text-xl font-bold mb-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors leading-tight">
                {recipe.title}
              </h2>
              <p className="text-ink-muted text-sm line-clamp-2 mb-4 flex-1">
                {recipe.description || 'No description provided.'}
              </p>
              
              <div className="flex items-center justify-between text-xs text-ink-muted pt-4 border-t border-border-subtle mt-auto uppercase tracking-wide font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{parseInt(recipe.prepTime) + parseInt(recipe.cookTime) || 90} Mins</span>
                </div>
                <div className="flex items-center gap-1">
                  Read <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
