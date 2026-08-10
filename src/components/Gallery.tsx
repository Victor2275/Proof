import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type BakeLog } from '../lib/api';
import { Calendar, Thermometer, Droplets } from 'lucide-react';

export default function Gallery() {
  const [logs, setLogs] = useState<BakeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'recipe'>('date');

  useEffect(() => {
    api.getBakeLogs().then(data => {
      // Filter out logs with no images for the gallery view
      setLogs(data.filter(l => l.imageUrls && l.imageUrls.length > 0));
      setLoading(false);
    }).catch(console.error);
  }, []);

  const sortedLogs = [...logs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      const titleA = typeof a.recipeId === 'object' ? a.recipeId.title : '';
      const titleB = typeof b.recipeId === 'object' ? b.recipeId.title : '';
      return titleA.localeCompare(titleB);
    }
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">Bake History</h1>
          <p className="text-ink-muted mt-2">A visual timeline of your culinary iterations.</p>
        </div>
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-md border border-border-subtle">
          <button 
            onClick={() => setSortBy('date')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${sortBy === 'date' ? 'bg-paper shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            By Date
          </button>
          <button 
            onClick={() => setSortBy('recipe')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${sortBy === 'recipe' ? 'bg-paper shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            By Recipe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-ink-muted font-medium uppercase tracking-wide text-sm">
          Loading History...
        </div>
      ) : sortedLogs.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-border-subtle rounded-xl text-ink-muted bg-sidebar/50">
          <p className="mb-2">No baked items logged yet.</p>
          <Link to="/" className="text-sm font-medium hover:underline">
            Use the "Start Recipe" mode to log your first bake!
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLogs.flatMap(log => 
            log.imageUrls.map((url, idx) => {
              const recipeIdStr = typeof log.recipeId === 'object' ? log.recipeId._id : log.recipeId;
              const recipeTitle = typeof log.recipeId === 'object' ? log.recipeId.title : 'Unknown Recipe';
              const dateStr = new Date(log.date).toLocaleDateString();

              return (
                <Link 
                  key={`${log._id}-${idx}`} 
                  to={`/recipe/${recipeIdStr}`}
                  className="group relative rounded-xl overflow-hidden aspect-square bg-black/5 dark:bg-white/5 border border-border-subtle shadow-sm"
                >
                  <img 
                    src={url} 
                    alt={`${recipeTitle} iteration`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-between text-white">
                    <div>
                      <h3 className="font-bold text-xl drop-shadow-md mb-2">{recipeTitle}</h3>
                      <div className="flex items-center gap-4 text-xs font-medium text-white/80">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {dateStr}</span>

                      </div>
                    </div>
                    
                    {log.notes && (
                      <p className="text-sm text-white/90 line-clamp-4 italic border-l-2 border-white/30 pl-3">
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
