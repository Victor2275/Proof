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
          className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-0.5 rounded-md text-sm font-bold hover:bg-accent/20 transition-colors mx-1 border border-accent/30 shadow-sm print:hidden align-baseline"
          title="Start Timer"
        >
          <Clock className="w-3.5 h-3.5" />
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
