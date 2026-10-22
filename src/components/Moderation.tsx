import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { queryKeys, useModerationQueue } from '../lib/queries';
import NotFound from './NotFound';
import { Button, Field, Panel, Prose, Skeleton } from './ui';

/*
 * The operator's moderation queue (LAUNCH_PLAN.md, Phase 3 item 10).
 *
 * Three lists, oldest first: recipes the screen held, comments the screen
 * held, and reports. Each item carries what is needed to decide it, and each
 * decision is one press. A rejection takes a reason, because the author sees
 * it and needs to know what to fix (B7). Only the operator ever reaches this
 * page; anyone else is shown nothing at this address.
 */
export default function Moderation() {
  const { session } = useSession();
  const queue = useModerationQueue(session.isOperator);
  const client = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!session.isOperator) return <NotFound />;

  const act = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await action();
      await client.invalidateQueries({ queryKey: queryKeys.moderation() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const reasonFor = (id: string) => reasons[id] ?? '';
  const reasonField = (id: string) => (
    <Field
      label="Reason"
      hint="Shown to the author when held back or taken down."
      value={reasonFor(id)}
      onChange={(e) => setReasons((r) => ({ ...r, [id]: e.target.value }))}
    />
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-20">
      <header className="flex flex-col gap-2 border-b border-rule pb-6">
        <h1 className="font-title text-3xl text-ink sm:text-4xl">Moderation</h1>
        <p className="text-ink-muted">What the screen held back, and what people reported, oldest first.</p>
      </header>

      {error ? (
        <p className="text-sm text-fault" role="alert">
          {error}
        </p>
      ) : null}

      {queue.isPending ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Opening the queue">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : queue.isError ? (
        <Panel title="Queue">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">{queue.error instanceof Error ? queue.error.message : "Couldn't open the queue."}</p>
            <Button className="self-start" onClick={() => queue.refetch()}>
              Try again
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          <Panel title={`Held recipes · ${queue.data.recipes.length}`}>
            {queue.data.recipes.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing held.</p>
            ) : (
              <ul className="flex flex-col">
                {queue.data.recipes.map((r) => (
                  <li key={r._id} className="flex flex-col gap-3 border-b border-rule py-4 first:pt-0 last:border-b-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-title text-lg text-ink">{r.title}</p>
                      <span className="ui-label text-ink-muted">@{r.authorHandle}</span>
                    </div>
                    {r.moderation.reason ? <p className="text-sm text-ink">Screen: {r.moderation.reason}</p> : null}
                    <p className="ui-label text-ink-muted">
                      {r.sourceUrl ? `Imported from ${r.sourceUrl}` : 'Written in Proof'}
                      {r.sourceAttribution ? ` · credit: ${r.sourceAttribution}` : ''}
                      {r.ownWords ? ' · says own words' : ''}
                    </p>
                    {r.description ? <Prose className="text-sm">{r.description}</Prose> : null}
                    <Prose className="line-clamp-4 text-sm text-ink-muted">{(r.instructions ?? []).join('\n')}</Prose>
                    {reasonField(r._id)}
                    <div className="flex flex-wrap gap-2">
                      <Button busy={busy === `a${r._id}`} onClick={() => act(`a${r._id}`, () => api.moderateRecipe(r._id, 'approve'))}>
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        busy={busy === `r${r._id}`}
                        onClick={() => act(`r${r._id}`, () => api.moderateRecipe(r._id, 'reject', reasonFor(r._id)))}
                      >
                        Hold back
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Held comments · ${queue.data.comments.length}`}>
            {queue.data.comments.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing held.</p>
            ) : (
              <ul className="flex flex-col">
                {queue.data.comments.map((c) => (
                  <li key={c._id} className="flex flex-col gap-3 border-b border-rule py-4 first:pt-0 last:border-b-0">
                    <span className="ui-label text-ink-muted">@{c.authorHandle}</span>
                    <Prose className="text-sm">{c.body}</Prose>
                    {c.moderation.reason ? <p className="text-sm text-ink-muted">Screen: {c.moderation.reason}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button busy={busy === `a${c._id}`} onClick={() => act(`a${c._id}`, () => api.moderateComment(c._id, 'approve'))}>
                        Approve
                      </Button>
                      <Button variant="danger" busy={busy === `r${c._id}`} onClick={() => act(`r${c._id}`, () => api.moderateComment(c._id, 'remove'))}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Reports · ${queue.data.reports.length}`}>
            {queue.data.reports.length === 0 ? (
              <p className="text-sm text-ink-muted">No open reports.</p>
            ) : (
              <ul className="flex flex-col">
                {queue.data.reports.map((report) => (
                  <li key={report._id} className="flex flex-col gap-3 border-b border-rule py-4 first:pt-0 last:border-b-0">
                    <p className="ui-label text-ink-muted">
                      {report.targetType === 'recipe' ? 'Recipe' : 'Comment'}
                      {report.target?.authorHandle ? ` by @${report.target.authorHandle}` : ''}
                      {!report.target ? ' · already gone' : ''}
                    </p>
                    {report.target?.title ? (
                      report.target.slug ? (
                        <Link to={`/r/${report.target.slug}`} className="font-title text-lg text-ink underline decoration-1 underline-offset-4">
                          {report.target.title}
                        </Link>
                      ) : (
                        <p className="font-title text-lg text-ink">{report.target.title}</p>
                      )
                    ) : null}
                    {report.target?.body ? <Prose className="text-sm">{report.target.body}</Prose> : null}
                    <p className="text-sm text-ink">Reported: {report.reason}</p>
                    {report.target && report.targetType === 'recipe' ? reasonField(report._id) : null}
                    <div className="flex flex-wrap gap-2">
                      {report.target ? (
                        <Button
                          variant="danger"
                          busy={busy === `t${report._id}`}
                          onClick={() =>
                            act(`t${report._id}`, async () => {
                              if (report.targetType === 'recipe') await api.moderateRecipe(report.targetId, 'takedown', reasonFor(report._id));
                              else await api.moderateComment(report.targetId, 'remove', report.reason);
                              await api.resolveReport(report._id, 'Taken down');
                            })
                          }
                        >
                          Take down
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        busy={busy === `d${report._id}`}
                        onClick={() => act(`d${report._id}`, () => api.resolveReport(report._id, 'Left up'))}
                      >
                        Leave it up
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
