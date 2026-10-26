import { useParams } from 'react-router-dom';
import { Share } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useProfile } from '../lib/queries';
import { systemShare } from '../lib/share';
import NotFound from './NotFound';
import { BackButton, Button, Prose, RecipeTile, Skeleton, Tag, useToast } from './ui';

/*
 * A baker's page, /@handle, as a bookshelf (LAUNCH_PLAN Phase 3 item 6; UI
 * overhaul change 127).
 *
 * The baker — their initials on a round plate, their name, their handle, their
 * own words — then their published recipes as covers on a shelf. A Share
 * button sends the page through the system's own sheet, or copies its address.
 * Like a shared recipe, it is a page a stranger opens from a link, so it has
 * no app chrome; Discover is one press back. The PRO tag sits here and
 * nowhere else (B14).
 */
export default function Profile() {
  const { at } = useParams<{ at: string }>();
  const toast = useToast();
  // One route answers every single-segment address the app doesn't know, so a
  // profile is only an address that starts with @.
  const handle = at?.startsWith('@') ? at.slice(1).toLowerCase() : undefined;
  const query = useProfile(handle);

  if (!handle) return <NotFound />;
  if (query.isError && query.error instanceof ApiError && query.error.status === 404) return <NotFound />;

  if (query.isPending) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-20 pt-4" role="status" aria-label="Opening the profile">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-9 w-56" />
        </div>
        <Skeleton className="h-4 w-full max-w-prose" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16" role="alert">
        <p className="font-title text-2xl text-ink">Couldn't open @{handle}'s page</p>
        <p className="text-ink-2">{query.error instanceof Error ? query.error.message : ''} The shared cookbook needs a connection.</p>
        <Button onClick={() => query.refetch()}>Try again</Button>
      </div>
    );
  }

  const { profile, recipes, stats } = query.data;
  const name = profile.displayName || `@${profile.handle}`;
  const initials = (profile.displayName || profile.handle)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const url = `${window.location.origin}/@${profile.handle}`;

  const share = async () => {
    const outcome = await systemShare({ title: `${name} on Proof`, url });
    if (outcome !== 'unavailable') return;
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: 'Link copied' });
    } catch {
      toast.show({ message: "Couldn't reach the clipboard.", tone: 'fault' });
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-20">
      <div className="pt-1 md:pt-4">
        <BackButton to="/discover" label="Discover" />
      </div>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="font-title flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-paper-tonal text-3xl text-ink-2"
          >
            {initials}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-title text-[2rem] leading-tight text-ink md:text-4xl">{name}</h1>
              {profile.pro ? <Tag>Pro</Tag> : null}
              {profile.moderator ? <Tag>Moderator</Tag> : null}
            </div>
            <p className="text-sm text-ink-muted">
              {profile.displayName ? `@${profile.handle} · ` : ''}
              {stats.published} {stats.published === 1 ? 'recipe' : 'recipes'}
              {stats.baked ? ` · baked ${stats.baked} ${stats.baked === 1 ? 'time' : 'times'} by others` : ''}
            </p>
          </div>
        </div>
        {profile.bio ? <Prose className="max-w-prose text-[1.0625rem]">{profile.bio}</Prose> : null}
        <Button className="self-start rounded-full" icon={<Share className="h-4 w-4" aria-hidden="true" />} onClick={share}>
          Share profile
        </Button>
      </header>

      <section aria-labelledby="shelf-heading" className="flex flex-col gap-4">
        <h2 id="shelf-heading" className="font-title border-b border-rule pb-2.5 text-2xl text-ink">
          On the shelf
        </h2>
        {recipes.length === 0 ? (
          <p className="text-ink-2">Nothing published yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {recipes.map((r) => (
              <li key={r._id}>
                <RecipeTile recipe={r} to={`/r/${r.slug}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
