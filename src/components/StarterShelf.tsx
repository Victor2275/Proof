import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useFeaturedRecipes, useForkPublished } from '../lib/queries';
import { haptic } from '../lib/haptics';
import { Button, RecipeTile, Skeleton } from './ui';

/*
 * The starter shelf on an empty cookbook (decisions B15–B17, change 41).
 *
 * A handful of recipes from the shared cookbook, each one press from being
 * yours: the photograph large, the name under it, and a small "Add" beside
 * the name rather than a heavy box under every tile. Starting from someone's
 * recipe is easier than starting from a blank form.
 *
 * The shelf needs the network; the cookbook does not. Offline, it says so in
 * a sentence, and the three doors above it still work.
 */
export default function StarterShelf() {
  const navigate = useNavigate();
  const featured = useFeaturedRecipes();
  const save = useForkPublished();

  return (
    <section className="flex flex-col gap-4" aria-labelledby="starter-shelf-heading">
      <div className="flex flex-col gap-1 border-b border-rule pb-2.5">
        <h2 id="starter-shelf-heading" className="font-title text-2xl text-ink">
          Or start from one of these
        </h2>
        <p className="text-ink-2">Add one and it becomes yours to change, cook and log.</p>
      </div>

      {save.isError ? (
        <p className="text-sm text-fault" role="alert">
          {save.error instanceof Error ? save.error.message : 'That recipe could not be added.'} Nothing was added to your
          cookbook; try again.
        </p>
      ) : null}

      {featured.isPending ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3" role="status" aria-label="Opening the shared cookbook">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : featured.isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ink-2">
            The shared cookbook needs a connection, and this device can't reach it right now. Your own cookbook works
            offline: start one with the doors above.
          </p>
          <Button onClick={() => featured.refetch()}>Try again</Button>
        </div>
      ) : featured.data.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          {featured.data.map((recipe) => (
            <li key={recipe._id} className="flex flex-col gap-1.5">
              <RecipeTile recipe={recipe} to={`/r/${recipe.slug}`} />
              <Button
                variant="tonal"
                className="h-11 self-start rounded-full pl-3 pr-4 text-sm"
                icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                busy={save.isPending && save.variables?._id === recipe._id}
                disabled={save.isPending}
                onClick={() =>
                  save.mutate(recipe, {
                    onSuccess: (saved) => {
                      haptic('success');
                      navigate(`/recipe/${saved._id}`);
                    },
                  })
                }
                aria-label={`Add ${recipe.title} to my cookbook`}
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
