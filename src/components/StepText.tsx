import { Fragment } from 'react';
import { Timer } from 'lucide-react';
import { findTimers, startTimer } from '../lib/stepTimers';
import { haptic } from '../lib/haptics';

/*
 * A step's words, with any time in them a timer you can start (change 80).
 *
 * The time stays part of the sentence — the same face and size, on a butter
 * wash with a small clock — rather than a box that breaks the line. Butter is
 * the timer's colour everywhere. Pressing it starts the timer at once, named
 * for the step and the phrase, and the pill at the top of the screen takes it
 * from there.
 */
export default function StepText({ text, name }: { text: string; name: string }) {
  const timers = findTimers(text);
  if (timers.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const t of timers) {
    if (t.start > at) parts.push(<Fragment key={`t${at}`}>{text.slice(at, t.start)}</Fragment>);
    parts.push(
      <button
        key={`b${t.start}`}
        type="button"
        onClick={() => {
          haptic('light');
          startTimer(t.seconds, `${name} · ${t.label}`);
        }}
        aria-label={`Start a ${t.label} timer`}
        className="pressable mx-0.5 inline-flex items-baseline gap-1 rounded-full bg-butter px-2 align-baseline text-on-butter hover:brightness-95 print:bg-transparent print:px-0"
      >
        <Timer className="h-[0.85em] w-[0.85em] self-center print:hidden" strokeWidth={2} aria-hidden="true" />
        {t.label}
      </button>,
    );
    at = t.end;
  }
  if (at < text.length) parts.push(<Fragment key={`t${at}`}>{text.slice(at)}</Fragment>);
  return <>{parts}</>;
}
