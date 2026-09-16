import { useState } from 'react';
import { renderWithTimers } from '../utils/timerParser';

/*
 * One step. The index is silkscreened in mono at a fixed width so the numbers
 * form a column down the method rather than drifting with the prose, and long
 * steps clamp until asked for — a recipe read at arm's length should show its
 * shape before it shows its detail.
 */

export default function ExpandableInstruction({ text = '', index }: { text: string; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (text || '').length > 150;

  return (
    <li className="flex gap-3">
      <span className="w-6 shrink-0 font-mono text-sm tabular-nums text-ink-muted">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`leading-relaxed text-ink ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {renderWithTimers(text || '', `Step ${index + 1}`)}
        </p>
        {!expanded && isLong && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="label-silkscreen mt-1.5 text-ink underline underline-offset-2"
          >
            Read more
          </button>
        )}
      </div>
    </li>
  );
}
