import { useState, useEffect } from 'react';
import { api, type Recipe, type BakeLog } from '../lib/api';
import { getLocalBakeLogs } from '../lib/localDB';
import { BarChart3, TrendingUp, Calendar, Hash } from 'lucide-react';

export default function Analytics() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [logs, setLogs] = useState<BakeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipesData, cloudLogs] = await Promise.all([
          api.getRecipes(''),
          api.getAllBakeLogs().catch(() => [])
        ]);

        // Gather all local logs as well
        let localLogs: BakeLog[] = [];
        for (const recipe of recipesData) {
          const lLogs = await getLocalBakeLogs(recipe._id!);
          localLogs = [...localLogs, ...lLogs];
        }

        const allLogs = [...cloudLogs, ...localLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecipes(recipesData);
        setLogs(allLogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-20 text-ink-muted">Loading analytics...</div>;

  const totalBakes = logs.length;
  const personalBests = logs.filter(l => l.isPersonalBest).length;
  const uniqueRecipes = new Set(logs.map(l => typeof l.recipeId === 'string' ? l.recipeId : l.recipeId._id)).size;

  // Most baked recipes
  const bakeCounts: Record<string, number> = {};
  logs.forEach(log => {
    const rid = typeof log.recipeId === 'string' ? log.recipeId : log.recipeId._id;
    bakeCounts[rid] = (bakeCounts[rid] || 0) + 1;
  });
  const topRecipeIds = Object.keys(bakeCounts).sort((a, b) => bakeCounts[b] - bakeCounts[a]).slice(0, 3);
  const topRecipes = topRecipeIds.map(id => ({
    recipe: recipes.find(r => r._id === id),
    count: bakeCounts[id]
  })).filter(x => x.recipe);

  // Month heatmap data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const logsThisYear = logs.filter(l => new Date(l.date).getFullYear() === currentYear);
  const monthCounts = new Array(12).fill(0);
  logsThisYear.forEach(l => monthCounts[new Date(l.date).getMonth()]++);
  const maxBakesInMonth = Math.max(...monthCounts, 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 border-b border-border-subtle pb-6">
        <BarChart3 className="w-8 h-8" />
        <h1 className="text-3xl font-bold tracking-tight uppercase">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-sidebar border border-border-subtle shadow-sm flex flex-col items-center justify-center text-center">
          <Hash className="w-8 h-8 text-ink-muted mb-2" />
          <span className="text-4xl font-black">{totalBakes}</span>
          <span className="text-sm font-bold text-ink-muted uppercase tracking-widest mt-1">Total Bakes</span>
        </div>
        <div className="p-6 rounded-2xl bg-sidebar border border-border-subtle shadow-sm flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-ink-muted mb-2" />
          <span className="text-4xl font-black text-yellow-600 dark:text-yellow-400">{personalBests}</span>
          <span className="text-sm font-bold text-ink-muted uppercase tracking-widest mt-1">Personal Bests</span>
        </div>
        <div className="p-6 rounded-2xl bg-sidebar border border-border-subtle shadow-sm flex flex-col items-center justify-center text-center">
          <Calendar className="w-8 h-8 text-ink-muted mb-2" />
          <span className="text-4xl font-black">{uniqueRecipes}</span>
          <span className="text-sm font-bold text-ink-muted uppercase tracking-widest mt-1">Unique Recipes</span>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-sidebar border border-border-subtle shadow-sm">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-8 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Bakes in {currentYear}
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {monthCounts.map((count, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
              <div className="w-full relative h-full flex items-end">
                <div 
                  className="w-full bg-ink/20 group-hover:bg-ink/40 transition-colors rounded-sm"
                  style={{ height: `${(count / maxBakesInMonth) * 100}%` }}
                ></div>
                {count > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>}
              </div>
              <span className="text-xs font-bold text-ink-muted uppercase">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {topRecipes.length > 0 && (
        <div className="p-8 rounded-2xl bg-sidebar border border-border-subtle shadow-sm">
          <h2 className="text-lg font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
            Most Baked
          </h2>
          <div className="space-y-4">
            {topRecipes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-paper border border-border-subtle">
                <span className="font-bold text-lg">{item.recipe?.title}</span>
                <span className="font-bold text-ink-muted bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">{item.count} makes</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
