import type { Recipe } from '../lib/api';
import RecipeImage from './RecipeImage';

interface RecipeHeaderProps {
  recipe: Recipe;
  heroImage?: string;
  scaleMultiplier: number;
}

export default function RecipeHeader({ recipe, heroImage, scaleMultiplier }: RecipeHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-8 pb-10 border-b border-border-subtle">
      {heroImage && (
        <RecipeImage
          src={heroImage}
          alt={recipe.title}
          className="w-full md:w-64 h-64 object-cover rounded-xl border border-border-subtle shadow-sm shrink-0"
          placeholderClassName="w-full md:w-64 h-64 rounded-xl border border-border-subtle shadow-sm shrink-0"
        />
      )}
      
      <div className="space-y-4 flex-1">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-ink uppercase">{recipe.title}</h1>
          <p className="text-ink-muted text-lg leading-relaxed">{recipe.description}</p>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {recipe.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-full font-medium text-ink-muted">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-6 md:gap-10 pt-4">
          <div>
            <div className="font-bold mb-1">Prep & Cook:</div>
            <div className="text-ink-muted">
              {recipe.prepTime ? recipe.prepTime.replace(/[\[\]]/g, '') : 'N/A'} {recipe.cookTime ? `/ ${recipe.cookTime.replace(/[\[\]]/g, '')}` : ''}
            </div>
          </div>
          <div>
            <div className="font-bold mb-1">Servings:</div>
            <div className="text-ink-muted">{recipe.servings ? recipe.servings * scaleMultiplier : 4 * scaleMultiplier}</div>
          </div>
          <div>
            <div className="font-bold mb-1">Difficulty:</div>
            <div className="text-ink-muted">{recipe.difficulty || 'Medium'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
