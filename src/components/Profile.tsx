import { useParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useProfile } from '../lib/queries';
import NotFound from './NotFound';
import { Button, Panel, PanelRow, Prose, RecipeTile, Skeleton, Tag } from './ui';

/*
 * A baker's public page, /@handle (LAUNCH_PLAN.md, Phase 3 item 6).
 *
 * Operate, not Persuade (decision B2): it looks like the product, because it
 * is the product. The chrome is the instrument; the bio is the baker's own
 * words, printed plainly (B1). The PRO tag sits in this header and nowhere
 * else (B14).
 */
export default function Profile() {
  const { at } = useParams<{ at: string }>();
  // One route answers every single-segment address the app doesn't know, so a
  // profile is only an address that starts with @.
  const handle = at?.startsWith('@') ? at.slice(1).toLowerCase() : undefined;
  const query = useProfile(handle);

  if (!handle) return <NotFound />;
  if (query.isError && query.error instanceof ApiError && query.error.status === 404) return <NotFound />;

  if (query.isPending) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-20" role="status" aria-label="Opening the profile">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
        <Panel title="Shared cookbook">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">Couldn't open @{handle}'s page.</p>
            <p className="text-sm text-ink-muted">{query.error instanceof Error ? query.error.message : ''}</p>
            <Button className="self-start" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const { profile, recipes, stats } = query.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-20">
      <header className="flex flex-col gap-4 border-b border-rule pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-title text-3xl text-ink md:text-4xl">{profile.displayName || `@${profile.handle}`}</h1>
          {profile.pro ? <Tag>Pro</Tag> : null}
        </div>
        {profile.displayName ? <p className="ui-label text-ink-muted">@{profile.handle}</p> : null}
        {profile.bio ? <Prose className="max-w-prose">{profile.bio}</Prose> : null}
        <div className="max-w-xs">
          <PanelRow label="Published" value={<span className="font-sans tabular-nums">{stats.published}</span>} />
          <PanelRow label="Times baked" value={<span className="font-sans tabular-nums">{stats.baked}</span>} />
        </div>
      </header>

      {recipes.length === 0 ? (
        <p className="text-ink-muted">Nothing published yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => (
            <li key={r._id}>
              <RecipeTile recipe={r} to={`/r/${r.slug}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
