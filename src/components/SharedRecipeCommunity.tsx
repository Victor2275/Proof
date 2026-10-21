import { useId, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { usePlan, useSession, useOwnership } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { useComments, useDeleteComment, useMyRating, usePostComment, useRateRecipe } from '../lib/queries';
import type { PublishedRecipe } from '../lib/types';
import { Button, Panel, PanelRow, Prose, Sheet, TextArea } from './ui';

/*
 * The shared recipe's conversation (LAUNCH_PLAN.md, Phase 3 items 7–8, 10).
 *
 * Ratings and "I baked this" are readings, so they print as counts in mono and
 * say "not rated yet" rather than inventing an average out of nothing. Rating
 * and baking take an account; the comments take a confirmed one. People's
 * words are printed matter (B1). Anything can be reported, by anyone.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function SharedRecipeCommunity({ recipe }: { recipe: PublishedRecipe }) {
  const { session } = useSession();
  const { isAuthor } = useOwnership(recipe);
  const [reporting, setReporting] = useState<{ type: 'recipe' | 'comment'; id: string } | null>(null);
  const stats = recipe.stats ?? { saves: 0, bakedCount: 0, ratingSum: 0, ratingCount: 0 };
  const average = stats.ratingCount > 0 ? (stats.ratingSum / stats.ratingCount).toFixed(1) : null;

  return (
    <section className="mt-12 flex flex-col gap-8" aria-label="From other bakers" data-html2canvas-ignore="true">
      <Panel title="From other bakers">
        <div className="flex flex-col gap-4">
          <div>
            <PanelRow
              label="Rating"
              value={
                <span className="font-mono tabular-nums">
                  {average ? `${average} of 5 · ${plural(stats.ratingCount, 'rating')}` : 'Not rated yet'}
                </span>
              }
            />
            <PanelRow label="Baked" value={<span className="font-mono tabular-nums">{plural(stats.bakedCount, 'time')}</span>} />
            <PanelRow label="Saved" value={<span className="font-mono tabular-nums">{plural(stats.saves, 'time')}</span>} />
          </div>
          {isAuthor ? (
            <p className="text-sm text-ink-muted">Your recipe. Ratings come from other bakers.</p>
          ) : session.user ? (
            <RateControl recipe={recipe} />
          ) : (
            <Button
              className="self-start"
              onClick={() => requestAccount('signin', 'Sign in to rate this recipe or say you baked it.')}
            >
              Sign in to rate it
            </Button>
          )}
        </div>
      </Panel>

      <Comments recipe={recipe} isAuthor={isAuthor} onReport={(id) => setReporting({ type: 'comment', id })} />

      <button
        type="button"
        onClick={() => setReporting({ type: 'recipe', id: recipe._id })}
        className="label-silkscreen flex min-h-11 items-center self-start text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
      >
        Report this recipe
      </button>

      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </section>
  );
}

function RateControl({ recipe }: { recipe: PublishedRecipe }) {
  const mine = useMyRating(recipe._id);
  const rate = useRateRecipe(recipe._id, recipe.slug);
  const stars = mine.data?.stars ?? null;
  const baked = mine.data?.baked ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-px" role="group" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              size="sm"
              engaged={stars !== null && n <= stars}
              aria-label={`Rate ${n} out of 5`}
              disabled={rate.isPending}
              onClick={() => rate.mutate({ stars: n === stars ? null : n })}
            >
              {n}
            </Button>
          ))}
        </div>
        <Button engaged={baked} disabled={rate.isPending} onClick={() => rate.mutate({ baked: !baked })}>
          I baked this
        </Button>
      </div>
      {rate.isError ? (
        <p className="text-sm text-fault" role="alert">
          {rate.error instanceof Error ? rate.error.message : "That didn't save. Try again."}
        </p>
      ) : null}
    </div>
  );
}

function Comments({ recipe, isAuthor, onReport }: { recipe: PublishedRecipe; isAuthor: boolean; onReport: (id: string) => void }) {
  const { session } = useSession();
  const { can } = usePlan();
  const comments = useComments(recipe._id);
  const post = usePostComment(recipe._id);
  const remove = useDeleteComment(recipe._id);
  const [body, setBody] = useState('');
  const formId = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await post.mutateAsync(body.trim());
      setBody('');
    } catch {
      // The message is drawn from post.error below; what was typed stays.
    }
  };

  const items = comments.data ?? [];

  return (
    <Panel title="Comments">
      <div className="flex flex-col gap-5">
        {comments.isPending ? null : comments.isError ? (
          <p className="text-sm text-ink-muted">The comments couldn't be loaded. The recipe is all here.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-muted">No comments yet.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((c) => (
              <li key={c._id} className="flex flex-col gap-1.5 border-b border-rule py-3 first:pt-0 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="label-silkscreen text-ink">@{c.authorHandle}</span>
                  <span className="font-mono text-xs tabular-nums text-ink-muted">
                    {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Prose className="text-sm">{c.body}</Prose>
                <div className="flex flex-wrap items-center gap-4">
                  {c.pending ? <span className="label-silkscreen text-ink-muted">Waiting for a look · only you can see it</span> : null}
                  {c.mine || isAuthor ? (
                    <button
                      type="button"
                      className="label-silkscreen flex min-h-11 items-center text-ink-muted hover:text-ink"
                      onClick={() => remove.mutate(c._id)}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="label-silkscreen flex min-h-11 items-center text-ink-muted hover:text-ink"
                      onClick={() => onReport(c._id)}
                    >
                      Report
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!session.user ? (
          <Button className="self-start" onClick={() => requestAccount('signin', 'Sign in to comment.')}>
            Sign in to comment
          </Button>
        ) : !can('publish') ? (
          <p className="text-sm text-ink-muted">Confirm your email to comment. The link is in the message sent to {session.user.email}.</p>
        ) : (
          <form id={formId} onSubmit={submit} className="flex flex-col gap-3 border-t border-rule pt-4">
            <TextArea
              label="Add a comment"
              value={body}
              maxLength={1000}
              rows={3}
              onChange={(e) => setBody(e.target.value)}
              error={post.isError ? (post.error instanceof Error ? post.error.message : "That didn't post. Try again.") : undefined}
            />
            <Button type="submit" className="self-start" busy={post.isPending} disabled={!body.trim()}>
              Post
            </Button>
          </form>
        )}
      </div>
    </Panel>
  );
}

function ReportSheet({ target, onClose }: { target: { type: 'recipe' | 'comment'; id: string } | null; onClose: () => void }) {
  const formId = useId();
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');

  const close = () => {
    setReason('');
    setState('idle');
    setError('');
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setState('busy');
    setError('');
    try {
      await api.report({ targetType: target.type, targetId: target.id, reason });
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : "The report didn't send. Try again.");
      setState('idle');
    }
  };

  return (
    <Sheet
      open={!!target}
      onClose={close}
      title={target?.type === 'comment' ? 'Report this comment' : 'Report this recipe'}
      size="sm"
      footer={
        state === 'sent' ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} busy={state === 'busy'} disabled={!reason.trim()}>
              Send report
            </Button>
          </>
        )
      }
    >
      {state === 'sent' ? (
        <p className="text-sm text-ink" role="status">
          Sent. The operator will look at it.
        </p>
      ) : (
        <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
          <TextArea
            label="What's wrong with it?"
            value={reason}
            maxLength={500}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            error={error || undefined}
            hint="Copied from somewhere, spam, abusive — say which."
          />
        </form>
      )}
    </Sheet>
  );
}
