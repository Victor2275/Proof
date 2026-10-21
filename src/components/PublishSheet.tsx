import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { usePlan, useSession } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { usePublishRecipe, useUnpublishRecipe } from '../lib/queries';
import { creditFromUrl, devicePhotoCount, publishBody } from '../lib/publication';
import type { Publication, Recipe } from '../lib/types';
import { Button, Field, Sheet, buttonClassName } from './ui';

/*
 * Publishing a recipe to the shared cookbook, or pushing an update to it.
 *
 * Publishing is the one mistake that is hard to take back, so the sheet says
 * plainly what will happen before it happens: a copy goes public, the recipe
 * here stays private and editable, and later edits stay private until pushed.
 * An imported recipe is asked for its credit (the attribution rule), with the
 * site's name to start from. Afterwards it says where the recipe landed —
 * live, or waiting for a look — and what stayed behind.
 */

export interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
  publication?: Publication;
}

type Outcome = { state: 'approved' | 'pending' | 'rejected'; slug: string; reason: string; droppedPhotos: number };

export default function PublishSheet({ open, onClose, recipe, publication }: PublishSheetProps) {
  const formId = useId();
  const { session } = useSession();
  const { can } = usePlan();
  const publish = usePublishRecipe();
  const unpublish = useUnpublishRecipe();
  const imported = !!recipe.sourceUrl;
  const [credit, setCredit] = useState('');
  const [ownWords, setOwnWords] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCredit(publication?.sourceAttribution || creditFromUrl(recipe.sourceUrl));
    setOwnWords(false);
    setError(null);
    setOutcome(null);
    setConfirmingUnpublish(false);
  }, [open, publication, recipe.sourceUrl]);

  const live = !!publication && !publication.unpublishedAt;
  const photos = devicePhotoCount(recipe.imageUrls ?? []);
  const otherPhotos = Math.min(3, recipe.imageUrls?.length ?? 0) - photos;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { recipe: copy, droppedPhotos } = await publish.mutateAsync(
        await publishBody(recipe, { sourceAttribution: imported ? credit : '', ownWords }),
      );
      setOutcome({ state: copy.moderation.state, slug: copy.slug, reason: copy.moderation.reason, droppedPhotos });
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "That couldn't be published. Your recipe is unchanged.",
        field: err instanceof ApiError ? err.field : undefined,
      });
    }
  };

  const takeDown = async () => {
    if (!publication) return;
    setError(null);
    try {
      await unpublish.mutateAsync(publication._id);
      onClose();
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "That couldn't be unpublished. Try again." });
    }
  };

  const title = live ? 'Push update' : 'Publish';

  // Not signed in, or not yet confirmed: say what it takes, and nothing else.
  if (!session.user || !can('publish')) {
    return (
      <Sheet open={open} onClose={onClose} title={title} size="sm" footer={<Button onClick={onClose}>Close</Button>}>
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-ink">
            Publishing puts a copy of this recipe in the shared cookbook, under your name. It needs an account with a
            confirmed email.
          </p>
          {!session.user ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => requestAccount('signin', 'Sign in to publish this recipe.')}>Sign in</Button>
              <Button variant="ghost" onClick={() => requestAccount('signup')}>
                Create an account
              </Button>
            </div>
          ) : (
            <p className="text-ink-muted">The confirmation link is in the message sent to {session.user.email}.</p>
          )}
        </div>
      </Sheet>
    );
  }

  if (outcome) {
    return (
      <Sheet open={open} onClose={onClose} title={title} size="sm" footer={<Button onClick={onClose}>Done</Button>}>
        <div className="flex flex-col gap-3 text-sm" role="status">
          {outcome.state === 'approved' ? (
            <>
              <p className="text-ink">Live in the shared cookbook.</p>
              <Link to={`/r/${outcome.slug}`} className={buttonClassName({ variant: 'secondary', className: 'self-start' })} onClick={onClose}>
                Open the public page
              </Link>
            </>
          ) : (
            <p className="text-ink">
              Waiting for a look before it goes live.{outcome.reason ? ` ${outcome.reason}` : ''} You'll see it here
              when it does.
            </p>
          )}
          {outcome.droppedPhotos > 0 ? (
            <p className="text-ink-muted">
              {outcome.droppedPhotos === 1 ? 'One photograph' : `${outcome.droppedPhotos} photographs`} stayed behind:
              only photographs taken on this device are published.
            </p>
          ) : null}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          {live ? (
            confirmingUnpublish ? (
              <Button variant="danger" onClick={takeDown} busy={unpublish.isPending}>
                Unpublish now
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmingUnpublish(true)}>
                Unpublish
              </Button>
            )
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button variant="primary" type="submit" form={formId} busy={publish.isPending}>
            {live ? 'Push update' : 'Publish'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink">
          {live
            ? 'The public copy is replaced with this recipe as it is now, at the same address.'
            : `A copy of "${recipe.title}" goes into the shared cookbook as @${session.user.handle}.`}
        </p>
        <p className="text-sm text-ink-muted">
          The recipe here stays yours and private. Edits you make later stay private until you push them.
        </p>
        <p className="label-silkscreen text-ink-muted">
          {photos === 0
            ? 'No photograph from this device'
            : `${photos} ${photos === 1 ? 'photograph' : 'photographs'} from this device`}
          {otherPhotos > 0 ? ` · ${otherPhotos} from other sites stay behind` : ''}
        </p>

        {imported ? (
          <div className="flex flex-col gap-3 border-t border-rule pt-4">
            <Field
              label="Credit"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              error={error?.field === 'sourceAttribution' ? error.message : undefined}
              hint={`Imported from ${creditFromUrl(recipe.sourceUrl)}. The credit shows under the title.`}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={ownWords} onChange={(e) => setOwnWords(e.target.checked)} className="h-5 w-5" />
              The method and description are in my own words
            </label>
          </div>
        ) : null}

        {error && error.field !== 'sourceAttribution' ? (
          <p className="text-sm text-fault" role="alert">
            {error.message}
          </p>
        ) : null}
        {confirmingUnpublish ? (
          <p className="text-sm text-ink" role="alert">
            Unpublishing takes the public page down. Copies other people saved stay with them.
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
