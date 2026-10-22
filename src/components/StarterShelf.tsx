import { Link, useNavigate } from 'react-router-dom';
import { useFeaturedRecipes, useForkPublished } from '../lib/queries';
import { STORED_ON_DEVICE } from '../lib/storage';
import { Button, Panel, RecipeTile, Skeleton, buttonClassName } from './ui';

/*
 * The empty cookbook (decisions B15–B17).
 *
 * A stranger's first library is their own and it is empty, which used to read
 * as a failed search: "No recipes found." The empty state is a shelf instead —
 * a handful of bakes from the shared cookbook, each one tap from being theirs.
 * Starting from someone's recipe is easier than starting from a blank form,
 * and the first thing a new baker does is the thing the app is for.
 *
 * The shelf needs the network; the cookbook does not. Offline, the shelf says
 * so in one line and the way to start from scratch stays right there.
 */

export default function StarterShelf() {
  const navigate = useNavigate();
  const featured = useFeaturedRecipes();
  const save = useForkPublished();

  return (
    <section className="flex flex-col gap-5" aria-labelledby="starter-shelf-heading">
      <div className="flex flex-col gap-2 border-b border-rule pb-3">
        <h2 id="starter-shelf-heading" className="font-title text-2xl text-ink">
          Start from one of these
        </h2>
        <p className="max-w-prose text-ink-muted">
          Save one and it becomes yours to edit, bake and log. Or start from a blank page.
        </p>
      </div>

      {save.isError ? (
        <p className="border border-fault bg-panel p-3 text-sm text-fault" role="alert">
          {save.error instanceof Error ? save.error.message : 'That recipe could not be saved.'} Nothing was
          added to your cookbook; try again.
        </p>
      ) : null}

      {featured.isPending ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4" role="status" aria-label="Opening the shared cookbook">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : featured.isError ? (
        <Panel title="Shared cookbook">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-muted">
              The shared cookbook needs a connection, and this device can't reach it right now. Your own
              cookbook works offline: start one from a blank page.
            </p>
            <Button className="self-start" onClick={() => featured.refetch()}>
              Try again
            </Button>
          </div>
        </Panel>
      ) : featured.data.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
          {featured.data.map((recipe) => (
            <li key={recipe._id} className="flex flex-col gap-2">
              <RecipeTile recipe={recipe} to={`/r/${recipe.slug}`} />
              {/* Pinned to the foot, so the keys line up when a title wraps. */}
              <Button
                size="lg"
                className="mt-auto w-full"
                busy={save.isPending && save.variables?._id === recipe._id}
                disabled={save.isPending}
                onClick={() => save.mutate(recipe, { onSuccess: (saved) => navigate(`/recipe/${saved._id}`) })}
                aria-label={`Save ${recipe.title} to my cookbook`}
              >
                Save
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <p className="ui-label text-ink-muted">{STORED_ON_DEVICE}</p>
        <Link to="/new" className={buttonClassName({ variant: 'secondary' })}>
          Write a recipe
        </Link>
      </div>
    </section>
  );
}
