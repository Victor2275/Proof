import { type BakeLog } from '../lib/api';
import { Award, Share2 } from 'lucide-react';
import { Button, RecipePlate, cn } from './ui';

/*
 * This recipe's own bake history.
 *
 * It was a grid of cards that flipped in 3D to show their notes — the previous
 * world's flourish, and one that hid the thing a baker came here for behind an
 * animation and a second click. It is now the same tile the Gallery uses: the
 * photograph leads, the date and the notes slide over its lower half on hover,
 * and one click opens the make. Learning the tile once should be enough.
 *
 * Attempts are numbered from the oldest, so "Make 3" means the third time this
 * was baked and keeps meaning that when a fourth is logged.
 */

interface BakeLogsGridProps {
  logs: BakeLog[];
  onSelect: (log: BakeLog) => void;
  onExportInstagram?: (log: BakeLog) => void;
}

function formatDate(iso?: string): string {
  const date = new Date(iso || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BakeLogsGrid({ logs, onSelect, onExportInstagram }: BakeLogsGridProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 border border-key-unlit" aria-hidden="true" />
          <span className="label-silkscreen text-silkscreen">No bakes logged</span>
        </div>
        <p className="max-w-prose text-ink-muted">
          Run this recipe in Baking Mode and log it at the end. The second time you do, this turns
          into a comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3">
      {logs.map((log, idx) => {
        // `logs` arrive newest first; the attempt number counts from the oldest.
        const attempt = logs.length - idx;
        return (
          <div key={log._id} className="flex flex-col gap-2">
            {/* Named explicitly: a bake with no photograph has no alt text to
              * lend the control a name, and "Make 3" is what the control opens
              * whether or not there is a picture of it. */}
            <button
              type="button"
              onClick={() => onSelect(log)}
              aria-label={`Make ${attempt}, ${formatDate(log.date)}`}
              className="group relative overflow-hidden rounded-key border border-rule text-left transition-colors hover:border-ink focus-visible:border-ink"
            >
              <RecipePlate src={log.imageUrls?.[0]} alt={`Make ${attempt}, ${formatDate(log.date)}`} size="hero" />

              {/* Not aria-hidden: the notes are the whole point of a bake log,
                * and hover is not available to everyone. */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 translate-y-full',
                  'border-t border-rule bg-panel faceplate px-3 py-2.5',
                  'transition-transform duration-150 ease-out',
                  'group-hover:translate-y-0 group-focus-visible:translate-y-0',
                )}
              >
                <span className="label-silkscreen block truncate text-silkscreen">
                  {formatDate(log.date)}
                </span>
                <p className="mt-1 line-clamp-3 text-sm leading-snug text-ink">
                  {log.notes || 'No notes recorded.'}
                </p>
              </div>
            </button>

            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="font-mono text-xs tabular-nums text-ink">Make {attempt}</span>
                {log.isPersonalBest && (
                  <span className="flex items-center gap-1 text-ink" title="Personal best">
                    <Award className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Personal best</span>
                  </span>
                )}
              </span>

              {onExportInstagram && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportInstagram(log)}
                  aria-label={`Export a card for make ${attempt}`}
                  icon={<Share2 className="h-3.5 w-3.5" />}
                >
                  Card
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
