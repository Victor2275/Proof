import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublications } from '../lib/queries';
import { publicationState } from '../lib/publication';
import type { Recipe } from '../lib/types';
import PublishSheet from './PublishSheet';
import { Button, PublishState } from './ui';

/*
 * The recipe header's line about the shared cookbook (decisions B6, B7):
 * where this recipe stands — only here, waiting for a look, live, or live with
 * edits not yet pushed — and the one control that moves it on. A rejection is
 * said in words with its reason and the fix, never in red.
 *
 * Signed out, the recipe is simply local, and the control still says Publish:
 * it explains what publishing takes when pressed (B10).
 */
export default function PublicationStrip({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false);
  const { byLocalId } = usePublications();
  const publication = byLocalId.get(recipe._id);
  const state = publicationState(recipe, publication);

  const label = state === 'edits' ? 'Push update' : state === 'local' || state === 'rejected' ? 'Publish' : 'Manage';

  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-rule pt-3" data-html2canvas-ignore="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PublishState state={state === 'rejected' ? 'local' : state} />
        <div className="flex items-center gap-2">
          {publication && (state === 'live' || state === 'edits') ? (
            <Link to={`/r/${publication.slug}`} className="ui-label text-ink underline decoration-1 underline-offset-4">
              Public page
            </Link>
          ) : null}
          <Button size="sm" onClick={() => setOpen(true)}>
            {label}
          </Button>
        </div>
      </div>
      {state === 'rejected' && publication ? (
        <p className="text-sm text-ink" role="status">
          Held back: {publication.moderation.reason || 'it needs another look.'} Edit the recipe, then publish again.
        </p>
      ) : null}
      {state === 'pending' && publication?.moderation.reason ? (
        <p className="text-sm text-ink-muted">{publication.moderation.reason}</p>
      ) : null}
      <PublishSheet open={open} onClose={() => setOpen(false)} recipe={recipe} publication={publication} />
    </div>
  );
}
