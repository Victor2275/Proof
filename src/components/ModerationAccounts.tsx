import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Search } from 'lucide-react';
import { api, type AccountDetail, type AccountFilter, type StaffAccount } from '../lib/api';
import { useSession } from '../lib/session';
import { queryKeys, useAccountDetail, useAccounts } from '../lib/queries';
import { haptic } from '../lib/haptics';
import { Button, Field, Panel, PanelRow, Prose, Select, Sheet, Skeleton, Tag, useToast } from './ui';
import { describeEntry } from '../lib/moderationLog';

/*
 * The accounts, as a moderator sees them (server/routes/accounts.ts).
 *
 * Newest first, searchable by handle, email or name, and narrowed to the ones
 * waiting to be confirmed, the moderators, or the suspended. An unconfirmed
 * account carries its Confirm on the row, since that is the job most visits
 * come for; everything else is in the account's sheet.
 *
 * A reversible decision — the moderator role, a suspension — happens at once
 * and offers Undo, rather than asking first. Nobody acts on their own account
 * here, so a moderator cannot lock themselves out by a slip.
 */

const FILTERS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: 'All accounts' },
  { value: 'unconfirmed', label: 'Waiting to be confirmed' },
  { value: 'moderators', label: 'Moderators' },
  { value: 'suspended', label: 'Suspended' },
];

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function StatusTags({ account }: { account: StaffAccount }) {
  return (
    <>
      {!account.emailVerified ? <Tag>Unconfirmed</Tag> : null}
      {account.moderator ? <Tag>Moderator</Tag> : null}
      {account.suspended ? <Tag>Suspended</Tag> : null}
    </>
  );
}

export default function ModerationAccounts() {
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const accounts = useAccounts(filter, q.trim(), true);
  const { session } = useSession();
  const confirmEmail = useConfirmEmail();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Search accounts"
          hideLabel
          placeholder="Handle, email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leading={<Search className="h-[18px] w-[18px]" aria-hidden="true" />}
          className="sm:flex-1"
        />
        <Select label="Show" hideLabel value={filter} onChange={(e) => setFilter(e.target.value as AccountFilter)} className="sm:w-64">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {accounts.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Opening the accounts">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : accounts.isError ? (
        <Panel title="Accounts">
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">{accounts.error instanceof Error ? accounts.error.message : "Couldn't open the accounts."}</p>
            <Button className="self-start" onClick={() => accounts.refetch()}>
              Try again
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel title={`${FILTERS.find((f) => f.value === filter)!.label} · ${accounts.data.total}`} flush>
          {accounts.data.items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-ink-muted">
              {q.trim() ? 'No account matches that search.' : filter === 'unconfirmed' ? 'Every account is confirmed.' : 'No accounts here.'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {accounts.data.items.map((a) => (
                <li key={a.id} className="flex items-center gap-2 border-t border-rule px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(a.id)}
                    className="pressable flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-control px-2 text-left hover:bg-paper-sunk active:bg-paper-tonal"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-ink">{a.displayName || `@${a.handle}`}</span>
                        <StatusTags account={a} />
                      </span>
                      <span className="truncate text-sm text-ink-muted">
                        {a.displayName ? `@${a.handle} · ` : ''}
                        {a.email}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                  {!a.emailVerified && a.id !== session.user?.id ? (
                    <Button
                      size="sm"
                      busy={busy === a.id}
                      aria-label={`Confirm @${a.handle}`}
                      onClick={async () => {
                        setBusy(a.id);
                        await confirmEmail(a);
                        setBusy(null);
                      }}
                    >
                      Confirm
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {accounts.data.total > accounts.data.items.length ? (
            <p className="border-t border-rule px-4 py-3 text-sm text-ink-muted">
              Showing the newest {accounts.data.items.length}. Search to find the rest.
            </p>
          ) : null}
        </Panel>
      )}

      <AccountSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Confirms an account's email and reports it. Confirming has no undo: there is nothing to take back. */
function useConfirmEmail() {
  const client = useQueryClient();
  const toast = useToast();
  return async (account: StaffAccount) => {
    try {
      await api.confirmAccount(account.id);
      haptic('success');
      toast.show({ message: `@${account.handle} is confirmed` });
    } catch (err) {
      toast.show({ message: err instanceof Error ? err.message : "That account couldn't be confirmed. Try again.", tone: 'fault' });
    }
    await client.invalidateQueries({ queryKey: queryKeys.moderation() });
  };
}

/*
 * Runs a decision now and offers its inverse in the toast. Like
 * useUndoableAction, but every step is on the server, so each failure is
 * reported as the server's.
 */
function useDecision() {
  const client = useQueryClient();
  const toast = useToast();
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.moderation() });
  return async ({ message, run, undo }: { message: string; run: () => Promise<unknown>; undo?: () => Promise<unknown> }) => {
    try {
      await run();
    } catch (err) {
      toast.show({ message: err instanceof Error ? err.message : 'That did not go through. Try again.', tone: 'fault' });
      return false;
    } finally {
      await refresh();
    }
    haptic('warning');
    toast.show({
      message,
      action: undo
        ? {
            label: 'Undo',
            onAction: () => {
              haptic('light');
              undo()
                .catch((err) => toast.show({ message: err instanceof Error ? err.message : "That couldn't be undone.", tone: 'fault' }))
                .finally(refresh);
            },
          }
        : undefined,
    });
    return true;
  };
}

const STATE_LABEL: Record<string, string> = { approved: 'Live', pending: 'Held', rejected: 'Held back', removed: 'Removed' };

function publishedState(r: AccountDetail['published'][number]) {
  if (r.unpublishedAt) return r.moderation.state === 'rejected' ? 'Taken down' : 'Unpublished';
  if (r.hiddenAt) return 'Hidden';
  return STATE_LABEL[r.moderation.state];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-title text-lg text-ink">{title}</h3>
      {children}
    </section>
  );
}

function AccountSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useAccountDetail(id);
  const { session } = useSession();
  const decide = useDecision();
  const confirmEmail = useConfirmEmail();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const close = () => {
    setReason('');
    setReasonError('');
    onClose();
  };

  const account = detail.data?.account;
  const own = !!account && account.id === session.user?.id;

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    await action();
    setBusy(null);
  };

  return (
    <Sheet
      open={!!id}
      onClose={close}
      title={account ? account.displayName || `@${account.handle}` : 'Account'}
      size="lg"
    >
      {detail.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Opening the account">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : detail.isError ? (
        <div className="flex flex-col gap-3" role="alert">
          <p className="text-ink">{detail.error instanceof Error ? detail.error.message : "Couldn't open the account."}</p>
          <Button className="self-start" onClick={() => detail.refetch()}>
            Try again
          </Button>
        </div>
      ) : account ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-1.5">
            <StatusTags account={account} />
          </div>

          <div className="flex flex-col">
            <PanelRow label="Handle" value={`@${account.handle}`} />
            <PanelRow label="Email" value={account.email} />
            <PanelRow label="Joined" value={date(account.joinedAt)} />
            <PanelRow label="Email confirmed" value={account.emailVerified ? 'Yes' : 'Not yet'} />
            <PanelRow label="Role" value={account.moderator ? 'Moderator' : 'Baker'} />
            <PanelRow label="Plan" value={account.plan === 'pro' ? 'Pro' : 'Free'} />
            <PanelRow
              label="Signed in"
              value={detail.data.sessions === 0 ? 'Nowhere' : `${detail.data.sessions} ${detail.data.sessions === 1 ? 'device' : 'devices'}`}
            />
            {account.suspended ? (
              <PanelRow label="Suspended" value={`${account.suspendedAt ? date(account.suspendedAt) : ''} · ${account.suspendedReason}`} />
            ) : null}
          </div>

          {own ? (
            <p className="text-sm text-ink-muted">This is your account. Another moderator, or the operator, can change it.</p>
          ) : (
            <Section title="Actions">
              <div className="flex flex-wrap gap-2">
                {!account.emailVerified ? (
                  <Button busy={busy === 'confirm'} onClick={() => run('confirm', () => confirmEmail(account))}>
                    Confirm email
                  </Button>
                ) : null}
                {account.moderator ? (
                  <Button
                    busy={busy === 'role'}
                    onClick={() =>
                      run('role', () =>
                        decide({
                          message: `@${account.handle} is no longer a moderator`,
                          run: () => api.setAccountRole(account.id, 'user'),
                          undo: () => api.setAccountRole(account.id, 'moderator'),
                        }),
                      )
                    }
                  >
                    Remove moderator
                  </Button>
                ) : account.emailVerified && !account.suspended ? (
                  <Button
                    busy={busy === 'role'}
                    onClick={() =>
                      run('role', () =>
                        decide({
                          message: `@${account.handle} is a moderator`,
                          run: () => api.setAccountRole(account.id, 'moderator'),
                          undo: () => api.setAccountRole(account.id, 'user'),
                        }),
                      )
                    }
                  >
                    Make moderator
                  </Button>
                ) : null}
                {detail.data.sessions > 0 ? (
                  <Button
                    busy={busy === 'signout'}
                    onClick={() =>
                      run('signout', () =>
                        decide({ message: `@${account.handle} is signed out everywhere`, run: () => api.signOutAccount(account.id) }),
                      )
                    }
                  >
                    Sign out everywhere
                  </Button>
                ) : null}
                {account.suspended ? (
                  <Button
                    busy={busy === 'suspend'}
                    onClick={() =>
                      run('suspend', () =>
                        decide({
                          message: `@${account.handle}'s suspension is lifted`,
                          run: () => api.unsuspendAccount(account.id),
                          undo: () => api.suspendAccount(account.id, account.suspendedReason || 'Suspended again'),
                        }),
                      )
                    }
                  >
                    Lift suspension
                  </Button>
                ) : null}
              </div>

              {!account.suspended && !account.moderator ? (
                <div className="mt-2 flex flex-col gap-2 border-t border-rule pt-4">
                  <Field
                    label="Reason for suspending"
                    hint="They see it when they try to sign in. Their published recipes and comments are hidden until it is lifted."
                    value={reason}
                    error={reasonError}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setReasonError('');
                    }}
                  />
                  <Button
                    variant="danger"
                    className="self-start"
                    busy={busy === 'suspend'}
                    onClick={() => {
                      const why = reason.trim();
                      if (!why) {
                        setReasonError('Give a reason first. They will see it.');
                        return;
                      }
                      void run('suspend', async () => {
                        const done = await decide({
                          message: `@${account.handle} is suspended`,
                          run: () => api.suspendAccount(account.id, why),
                          undo: () => api.unsuspendAccount(account.id),
                        });
                        if (done) setReason('');
                      });
                    }}
                  >
                    Suspend
                  </Button>
                </div>
              ) : null}
            </Section>
          )}

          <Section title={`Published · ${detail.data.published.length}`}>
            {detail.data.published.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing published.</p>
            ) : (
              <ul className="flex flex-col">
                {detail.data.published.map((r) => {
                  const state = publishedState(r);
                  const row = (
                    <>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.title}</span>
                      <span className="ui-label shrink-0 text-ink-muted">{state}</span>
                    </>
                  );
                  return (
                    <li key={r._id} className="border-b border-rule last:border-b-0">
                      {state === 'Live' ? (
                        <Link
                          to={`/r/${r.slug}`}
                          onClick={close}
                          className="pressable flex min-h-11 items-center gap-3 rounded-control px-1 hover:bg-paper-sunk active:bg-paper-tonal"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="flex min-h-11 items-center gap-3 px-1">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Recent comments">
            {detail.data.comments.length === 0 ? (
              <p className="text-sm text-ink-muted">No comments.</p>
            ) : (
              <ul className="flex flex-col">
                {detail.data.comments.map((c) => (
                  <li key={c._id} className="flex flex-col gap-1 border-b border-rule py-2.5 last:border-b-0">
                    <p className="ui-label text-ink-muted">
                      {c.recipe ? `On ${c.recipe.title}` : 'On a recipe that is gone'} · {date(c.createdAt)} ·{' '}
                      {c.deletedAt ? 'Deleted' : STATE_LABEL[c.moderation.state]}
                    </p>
                    <Prose className="text-sm">{c.body}</Prose>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Reports against them">
            {detail.data.reports.length === 0 ? (
              <p className="text-sm text-ink-muted">No reports.</p>
            ) : (
              <ul className="flex flex-col">
                {detail.data.reports.map((r) => (
                  <li key={r._id} className="flex flex-col gap-1 border-b border-rule py-2.5 last:border-b-0">
                    <p className="ui-label text-ink-muted">
                      {r.targetType === 'recipe' ? 'A recipe' : 'A comment'} · {date(r.createdAt)} ·{' '}
                      {r.resolvedAt ? r.resolution || 'Resolved' : 'Open'}
                    </p>
                    <p className="text-sm text-ink">{r.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="History">
            {detail.data.log.length === 0 ? (
              <p className="text-sm text-ink-muted">No moderator has acted on this account.</p>
            ) : (
              <ul className="flex flex-col">
                {detail.data.log.map((e) => (
                  <li key={e._id} className="border-b border-rule py-2 text-sm text-ink last:border-b-0">
                    {describeEntry(e)}
                    <span className="text-ink-muted"> · {date(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      ) : null}
    </Sheet>
  );
}
