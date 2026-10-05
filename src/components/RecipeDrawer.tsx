import { useState, useEffect, useCallback } from 'react';
import { api, type Recipe } from '../lib/api';
import { Check } from 'lucide-react';
import { Button, Sheet, Skeleton } from './ui';

interface RecipeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
}

/*
 * A sub-recipe opened from inside Baking Mode — the frosting a cake step
 * names. It rises from the bottom edge over the step being worked, and is
 * printed the way the recipe page prints: a ruled ingredient list with the
 * quantities in mono, then the method.
 */
export default function RecipeDrawer({ isOpen, onClose, recipeId }: RecipeDrawerProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api.getRecipe(recipeId)
      .then(setRecipe)
      .catch(() => {
        setRecipe(null);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  useEffect(() => {
    if (isOpen && recipeId) load();
  }, [isOpen, recipeId, load]);

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={recipe && !loading ? recipe.title : 'Sub-recipe'}
      placement="bottom"
      size="xl"
      layer={110}
      footer={
        !loading && recipe ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onClose}
            icon={<Check className="h-5 w-5" aria-hidden="true" />}
          >
            Finish {recipe.title}
          </Button>
        ) : undefined
      }
    >
      <div data-testid="recipe-drawer-content">
        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading sub-recipe">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : recipe ? (
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-2">
              <h3 className="label-silkscreen">Ingredients</h3>
              <ul className="flex flex-col border-t border-rule">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
                    <span className="text-ink">{ing.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-ink">
                      {ing.quantity} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="label-silkscreen">Method</h3>
              <ol className="flex flex-col gap-4">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="w-6 shrink-0 pt-1 font-mono text-sm tabular-nums text-ink-muted">
                      {idx + 1}
                    </span>
                    <p className="max-w-prose text-lg leading-relaxed text-ink">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : failed ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-fault">Couldn't load this sub-recipe. Check the connection and try again.</p>
            <Button onClick={load}>Try again</Button>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
