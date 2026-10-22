import { Check } from 'lucide-react';
import { useRecipe } from '../lib/queries';
import { formatAmount } from '../lib/ingredients';
import { Button, Sheet } from './ui';

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
 *
 * It is read from the device, so there is nothing to wait for and no skeleton
 * (B30). A sub-recipe deleted since it was linked says so.
 */
export default function RecipeDrawer({ isOpen, onClose, recipeId }: RecipeDrawerProps) {
  const { data: recipe, isPending, isError, refetch } = useRecipe(isOpen ? recipeId : undefined);

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={recipe ? recipe.title : 'Sub-recipe'}
      placement="bottom"
      size="xl"
      layer={110}
      footer={
        recipe ? (
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
        {isPending ? null : isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-fault">Couldn't read this sub-recipe on this device.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        ) : !recipe ? (
          <p className="text-ink-muted">
            This step links to a recipe that is no longer in the cookbook. Remove the link in the editor.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-2">
              <h3 className="ui-label">Ingredients</h3>
              <ul className="flex flex-col border-t border-rule">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
                    <span className="text-ink">{ing.name}</span>
                    <span className="shrink-0 font-sans tabular-nums text-ink">{formatAmount(ing)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="ui-label">Method</h3>
              <ol className="flex flex-col gap-4">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="w-6 shrink-0 pt-1 font-sans text-sm tabular-nums text-ink-muted">
                      {idx + 1}
                    </span>
                    <p className="max-w-prose text-lg leading-relaxed text-ink">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </Sheet>
  );
}
