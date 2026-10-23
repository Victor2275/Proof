import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePublications, useRecipes } from '../lib/queries';
import { publicationState } from '../lib/publication';
import { useSession } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { BackButton, Button, PageHeader, PublishState, Skeleton } from './ui';

/*
 * My published recipes (change 132): the copies of your recipes that other
 * people can find, and where each one stands. Each row opens the recipe on
 * this device, where publishing is managed.
 */
export default function PublishedPage() {
  const { session } = useSession();
  const publications = usePublications();
  const recipes = useRecipes();
  const local = new Map((recipes.data ?? []).map((r) => [r._id, r]));
  const items = (publications.data ?? []).filter((p) => !p.unpublishedAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-20">
      <PageHeader back={<BackButton to="/settings" label="Settings" />} title="Published" />

      {!session.user ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ink-2">
            Publishing puts a copy of a recipe where others can find it. It needs an account; your own cookbook never
            does.
          </p>
          <Button onClick={() => requestAccount('signin')}>Sign in</Button>
        </div>
      ) : publications.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Opening">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : publications.isError ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-fault">Couldn't reach the shared cookbook, so this list can't be read right now.</p>
          <p className="text-sm text-ink-muted">Your recipes are safe on this device. Try again when you're online.</p>
          <Button onClick={() => void publications.refetch()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-ink-2">
          Nothing published yet. Open a recipe and choose Publish to share it with other bakers.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((p) => {
            const recipe = local.get(p.sourceLocalId);
            const state = recipe ? publicationState(recipe, p) : 'live';
            return (
              <li key={p._id} className="border-b border-rule last:border-b-0">
                <Link
                  to={recipe ? `/recipe/${recipe._id}` : `/r/${p.slug}`}
                  className="pressable -mx-2 flex min-h-[3.75rem] items-center gap-3 rounded-control px-2 py-2 hover:bg-paper-sunk"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-title truncate text-lg text-ink">{p.title}</span>
                    {state === 'rejected' ? (
                      <span className="text-sm text-ink-2">
                        Held back · {p.moderation.reason || 'it needs another look'}
                      </span>
                    ) : (
                      <PublishState state={state} />
                    )}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
