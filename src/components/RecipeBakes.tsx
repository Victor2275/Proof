import { Link } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import type { BakeLog } from '../lib/types';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { firstLine } from '../lib/recipeText';
import { MarginNote, Photo, Stamp, Stars, cn } from './ui';

/*
 * The bake log, on the recipe it belongs to (changes 62–65).
 *
 * "Last time" sits under the title: the date, the stars, what happened, and
 * the note the baker left for this attempt, pencilled. The whole card is one
 * target that opens this recipe's bakes. "Your bakes" runs along the foot of
 * the page, oldest to newest, so the strip itself is the progress; a bake
 * without a photograph is a note card, never an empty box.
 */

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function LastTimeCard({ recipeId, bakes }: { recipeId: string; bakes: BakeLog[] }) {
  const last = bakes[0];
  if (!last) return null;
  const count = bakes.length;
  const note = firstLine(last.notes);
  const label = [
    `Last time, ${shortDate(last.date)}`,
    last.rating ? `${last.rating} of 5 stars` : '',
    note,
    last.nextTime ? `Next time: ${last.nextTime}` : '',
    `Open all ${count} ${count === 1 ? 'bake' : 'bakes'}`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Link
      to={`/bakes?recipe=${recipeId}`}
      aria-label={label}
      className="pressable flex flex-col gap-2 rounded-panel bg-paper-sunk px-4 pb-3 pt-4 hover:bg-paper-tonal"
    >
      <span className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
        <span className="font-semibold text-ink">Last time · {shortDate(last.date)}</span>
        <Stars value={last.rating} />
      </span>
      {note ? <span className="font-prose line-clamp-3 text-[1.0625rem] leading-snug text-ink">“{note}”</span> : null}
      {last.nextTime ? <MarginNote lead="Next time">{last.nextTime}</MarginNote> : null}
      <span className="flex items-center justify-end gap-0.5 text-sm font-semibold text-ink-2">
        {count} {count === 1 ? 'bake' : 'bakes'}
        <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
    </Link>
  );
}

export interface YourBakesProps {
  /** Newest first, as the repository reads them. */
  bakes: BakeLog[];
  onOpen: (log: BakeLog) => void;
  onLog?: () => void;
  /** The bake just logged, whose stamp is pressed on as it appears. */
  freshId?: string;
}

export function YourBakes({ bakes, onOpen, onLog, freshId }: YourBakesProps) {
  const oldestFirst = [...bakes].reverse();
  return (
    <section aria-labelledby="your-bakes-heading" className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between border-b border-rule pb-2.5">
        <h2 id="your-bakes-heading" className="font-title text-2xl text-ink">
          Your bakes
        </h2>
        {bakes.length ? <span className="text-sm text-ink-muted">{bakes.length} so far</span> : null}
      </div>
      {bakes.length === 0 ? (
        <p className="text-ink-2">
          None yet. Start cooking, or log a bake you&apos;ve already made, and it will be kept here, oldest first.
        </p>
      ) : null}
      <ol className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 pt-1 sm:mx-0 sm:px-0">
        {oldestFirst.map((log, i) => {
          const photo = bakePhotoUrls(log)[0];
          const n = i + 1;
          return (
            <li key={log._id} className="relative w-[8.25rem] shrink-0">
              <button
                type="button"
                onClick={() => onOpen(log)}
                aria-label={`Bake ${n}, ${shortDate(log.date)}${log.rating ? `, ${log.rating} of 5 stars` : ''}${log.isPersonalBest ? ', personal best' : ''}`}
                className="pressable flex w-full flex-col gap-1.5 rounded-key text-left"
              >
                {photo ? (
                  <Photo src={photo} alt="" className="aspect-square w-full rounded-key object-cover" />
                ) : (
                  <span className="flex aspect-square w-full flex-col justify-between rounded-key bg-paper-sunk p-3">
                    <span className="font-title text-[1.75rem] leading-none text-pencil">{n}</span>
                    <span className="font-prose line-clamp-3 text-sm italic leading-snug text-ink-2">
                      {firstLine(log.notes) ? `“${firstLine(log.notes)}”` : 'No notes'}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[0.8125rem] text-ink">
                  {shortDate(log.date)}
                  <Stars value={log.rating} />
                </span>
              </button>
              {log.isPersonalBest ? (
                <Stamp rating={log.rating} fresh={log._id === freshId} className="pointer-events-none absolute -right-1 -top-1" />
              ) : null}
            </li>
          );
        })}
        {onLog ? (
          <li className="w-[6.5rem] shrink-0">
            <button
              type="button"
              onClick={onLog}
              className={cn(
                'pressable flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-key border border-dashed border-rule-strong',
                'text-sm font-semibold text-ink hover:bg-paper-sunk',
              )}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Log a bake
            </button>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
