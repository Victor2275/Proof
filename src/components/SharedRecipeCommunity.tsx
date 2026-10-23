import { useId, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { usePlan, useSession, useOwnership } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { useComments, useDeleteComment, useMyRating, usePostComment, useRateRecipe } from '../lib/queries';
import type { PublishedRecipe } from '../lib/types';
import { Button, Prose, Sheet, StarRating, Stars, TextArea } from './ui';

/*
 * What other bakers made of a shared recipe (LAUNCH_PLAN Phase 3 items 7–8,
 * 10; UI overhaul changes 129–130).
 *
 * Readings print only when there are some: an average of no ratings is not a
 * number, so a recipe nobody has rated says "Be the first to bake this" and
 * stops. What bakers wrote is set as marginalia — "What bakers noticed", each
 * note pencilled under its baker's handle — because that is what a comment on
 * a recipe is: a note in the margin of someone else's book. People's words are
 * their own (B1). Rating and "I baked this" take an account; writing a note
 * takes a confirmed one. Anything can be reported.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function SharedRecipeCommunity({ recipe }: { recipe: PublishedRecipe }) {
  const { session } = useSession();
  const { isAuthor } = useOwnership(recipe);
  const [reporting, setReporting] = useState<{ type: 'recipe' | 'comment'; id: string } | null>(null);
  const stats = recipe.stats ?? { saves: 0, bakedCount: 0, ratingSum: 0, ratingCount: 0 };
  const average = stats.ratingCount > 0 ? stats.ratingSum / stats.ratingCount : null;
  const readings = [
    average !== null ? `${average.toFixed(1)} of 5 from ${plural(stats.ratingCount, 'rating')}` : '',
    stats.bakedCount ? `baked ${plural(stats.bakedCount, 'time')}` : '',
    stats.saves ? `saved ${plural(stats.saves, 'time')}` : '',
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-6 print:hidden" aria-labelledby="noticed-heading" data-html2canvas-ignore="true">
      <div className="flex flex-col gap-1 border-b border-rule pb-2.5">
        <h2 id="noticed-heading" className="font-title text-2xl text-ink">
          What bakers noticed
        </h2>
        {readings.length ? (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            {average !== null ? <Stars value={Math.round(average)} /> : null}
            {readings.join(' · ')}
          </p>
        ) : (
          <p className="text-sm text-ink-2">Be the first to bake this.</p>
        )}
      </div>

      {isAuthor ? (
        <p className="text-sm text-ink-muted">Your recipe. Ratings come from other bakers.</p>
      ) : session.user ? (
        <RateControl recipe={recipe} />
      ) : (
        <Button className="self-start" onClick={() => requestAccount('signin', 'Sign in to rate this recipe or say you baked it.')}>
          Sign in to rate it
        </Button>
      )}

      <Comments recipe={recipe} isAuthor={isAuthor} onReport={(id) => setReporting({ type: 'comment', id })} />

      <Button variant="ghost" size="sm" className="self-start text-ink-muted" onClick={() => setReporting({ type: 'recipe', id: recipe._id })}>
        Report this recipe
      </Button>

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <StarRating label="Your rating" value={stars} onChange={(next) => rate.mutate({ stars: next })} className="-ml-2" />
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
    <div className="flex flex-col gap-5">
      {comments.isError ? (
        <p className="text-sm text-ink-muted">The notes couldn't be loaded. The recipe is all here.</p>
      ) : items.length ? (
        <ul className="flex flex-col gap-4">
          {items.map((c) => (
            <li key={c._id} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem]">
                <span className="font-semibold text-ink">@{c.authorHandle}</span>
                <span className="tabular-nums text-ink-muted">
                  {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {c.pending ? <span className="text-ink-muted">· waiting for a look, only you can see it</span> : null}
              </p>
              <Prose className="font-prose border-l-2 border-rule pl-3 text-[1.0625rem] italic text-pencil">{c.body}</Prose>
              {c.mine || isAuthor ? (
                <Button variant="ghost" size="sm" className="self-start text-ink-muted" onClick={() => remove.mutate(c._id)}>
                  Delete
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="self-start text-ink-muted" onClick={() => onReport(c._id)}>
                  Report
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {!session.user ? (
        <Button variant="ghost" className="self-start" onClick={() => requestAccount('signin', 'Sign in to add what you noticed.')}>
          Sign in to add a note
        </Button>
      ) : !can('publish') ? (
        <p className="text-sm text-ink-muted">Confirm your email to add a note. The link is in the message sent to {session.user.email}.</p>
      ) : (
        <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
          <TextArea
            label="What you noticed"
            prose
            value={body}
            maxLength={1000}
            rows={2}
            onChange={(e) => setBody(e.target.value)}
            hint="Baked it? What worked, what you would change."
            error={post.isError ? (post.error instanceof Error ? post.error.message : "That didn't post. Try again.") : undefined}
          />
          <Button type="submit" className="self-start" busy={post.isPending} disabled={!body.trim()}>
            Add the note
          </Button>
        </form>
      )}
    </div>
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
