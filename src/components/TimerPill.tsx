import { useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Timer as TimerIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { useActiveBake } from '../lib/useActiveBake';
import { formatTimerClock, getRunningTimers, leadTimer, OPEN_TIMERS_EVENT, subscribeRunningTimers } from '../lib/timerBus';

/*
 * "Oven · 12:04": the bake you left, from anywhere in the app.
 *
 * While a bake runs or a timer counts, a small butter pill sits at the top of
 * every screen (change 27). It names the timer nearest its end — the one you
 * will need first — and how many others are running. Pressed, it goes back to
 * baking mode; with no bake open, it opens the timers themselves. Baking mode
 * shows its own timers, so the pill stays out of it.
 *
 * Butter is the timer's colour and only the timer's. A timer past its end
 * keeps the colour and gains a minus sign and weight, rather than turning
 * into an alarm the whole screen has to look at.
 */

/**
 * `dock`: the phone's placement, a sticky row at the top of the page, in the
 * flow so it never covers the header beneath it. Without it, the pill alone,
 * for the desktop's top bar.
 */
export default function TimerPill({ className, dock = false }: { className?: string; dock?: boolean }) {
  const timers = useSyncExternalStore(subscribeRunningTimers, getRunningTimers, getRunningTimers);
  const bake = useActiveBake();
  const { pathname } = useLocation();

  if (/^\/recipe\/[^/]+\/bake$/.test(pathname)) return null;
  if (timers.length === 0 && !bake) return null;

  const lead = leadTimer(timers);
  const clock = lead ? formatTimerClock(lead.remainingMs).replace(/^-/, '−') : '';
  const others = timers.length - 1;
  const text = lead ? `${lead.name} · ${clock}` : bake ? `Baking ${bake.recipeTitle}` : '';
  const spoken = [
    bake ? `Return to baking ${bake.recipeTitle}` : 'Open timers',
    lead ? `${lead.name} timer ${lead.remainingMs < 0 ? 'over by' : ''} ${clock.replace('−', '')}${lead.running ? '' : ', paused'}` : '',
    others > 0 ? `and ${others} more` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const body = (
    <>
      <TimerIcon className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span className={cn('min-w-0 truncate tabular-nums', lead && lead.remainingMs < 0 && 'font-semibold')}>{text}</span>
      {others > 0 ? <span className="shrink-0 text-on-butter/80">+{others}</span> : null}
    </>
  );
  const look = cn(
    'pressable inline-flex min-h-11 max-w-[17rem] items-center gap-2 rounded-full bg-butter px-3.5 font-sans text-sm font-medium text-on-butter',
    className,
  );

  const pill = bake ? (
    <Link to={`/recipe/${bake.recipeId}/bake`} aria-label={spoken} className={look}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={spoken}
      aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new Event(OPEN_TIMERS_EVENT))}
      className={look}
    >
      {body}
    </button>
  );

  return dock ? (
    <div className="sticky top-[env(safe-area-inset-top)] z-20 -mt-3 flex justify-center pb-1 md:hidden">{pill}</div>
  ) : (
    pill
  );
}
