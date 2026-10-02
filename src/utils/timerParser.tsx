import { Clock } from 'lucide-react';

export const renderWithTimers = (text: string, title = "Timer") => {
  // Matches "1.5 hours", "45 mins", "30s"
  const regex = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    let durationSecs = 0;
    if (unit.startsWith('h')) durationSecs = val * 3600;
    else if (unit.startsWith('m')) durationSecs = val * 60;
    else if (unit.startsWith('s')) durationSecs = val;

    if (durationSecs > 0) {
      parts.push(
        <button
          key={match.index}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('add-timer', { 
              detail: { durationSecs, name: `${title} (${fullMatch})` } 
            }));
          }}
          // A timer written into the method is queued, not running: an unlit
          // key the baker can press. It lights only once it is counting, in the
          // timer readout — red here put a dozen "nows" on a page where
          // nothing had started.
          className="mx-1 inline-flex items-center gap-1 rounded-key border border-rule px-1.5 py-0.5 align-baseline font-mono text-[0.9em] tabular-nums text-ink transition-colors hover:border-ink print:hidden"
          title="Start timer"
        >
          <Clock className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          {fullMatch}
        </button>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};
