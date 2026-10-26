import { describeEntry } from '../lib/moderationLog';
import { useModerationLog } from '../lib/queries';
import { Button, Panel, Skeleton } from './ui';

/*
 * The moderation log: who confirmed, promoted, suspended, approved or took
 * down what, and when — newest first. With more than one moderator, this is
 * how anyone can see who decided something.
 */

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function ModerationLog() {
  const log = useModerationLog(true);

  if (log.isPending) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="Opening the log">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (log.isError) {
    return (
      <Panel title="Log">
        <div className="flex flex-col gap-3" role="alert">
          <p className="text-ink">{log.error instanceof Error ? log.error.message : "Couldn't open the log."}</p>
          <Button className="self-start" onClick={() => log.refetch()}>
            Try again
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Log · ${log.data.total}`}>
      {log.data.items.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing has been decided yet.</p>
      ) : (
        <ul className="flex flex-col">
          {log.data.items.map((e) => (
            <li key={e._id} className="flex flex-col gap-0.5 border-b border-rule py-2.5 last:border-b-0">
              <p className="text-sm text-ink">{describeEntry(e)}</p>
              <p className="ui-label text-ink-muted">
                {when(e.createdAt)}
                {e.reason ? ` · ${e.reason}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {log.data.total > log.data.items.length ? (
        <p className="mt-2 text-sm text-ink-muted">The newest {log.data.items.length} of {log.data.total}.</p>
      ) : null}
    </Panel>
  );
}
