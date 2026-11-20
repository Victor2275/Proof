import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../lib/api';
import { userToken, useSession } from '../lib/session';
import { ulid } from '../lib/ulid';
import { hapticsEnabled, ttsEnabled } from '../lib/settings';
import { publishRunningTimers, formatTimerClock, OPEN_TIMERS_EVENT } from '../lib/timerBus';
import { timerHref, type TimerOrigin } from '../lib/stepTimers';
import { Button, IconButton, Readout, Sheet } from './ui';

export interface Timer {
  id: string;
  name: string;
  endTime: number | null;
  remainingMs: number;
  hasRung: boolean;
  /** The recipe and step it was started from. Kept on this device only. */
  from?: TimerOrigin;
}

const socketUrl = API_URL.replace('/api', '');

/*
 * Timers run on the device. They used to exist only as a round trip through
 * the server, so with no connection a step's timer simply never started — in
 * a kitchen, which is where the connection drops. Now each change lands here
 * first and is kept in localStorage, so a reload mid-bake resumes it.
 *
 * Signed in, the same timers sync between the account's devices over a socket
 * room of their own (server/routes/timers.ts). Signed out, nothing is sent.
 */
const TIMERS_KEY = 'proof.timers';

/*
 * The server keeps a timer's name and clock, not where it came from: the
 * recipe may not exist on the account's other devices. A sync from the server
 * keeps the origin this device already knew.
 */
const keepOrigins = (incoming: Timer[], known: Timer[]): Timer[] =>
  incoming.map((t) => {
    const from = known.find((k) => k.id === t.id)?.from;
    return from ? { ...t, from } : t;
  });

// A private recipe has no server-side representation, so its id is not sent.
const forServer = ({ from: _from, ...t }: Timer) => t;

function loadTimers(): Timer[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TIMERS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveTimers(timers: Timer[]) {
  try {
    localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
  } catch {
    // Storage blocked: the timers still run for this page.
  }
}

/** Runs one part of an alarm; a part the device refuses must not silence the rest. */
function attempt(part: () => void) {
  try {
    part();
  } catch {
    // Unsupported here: the other parts of the alarm still sound.
  }
}

/** The alarm for a timer that has reached zero: sound, speech, a notification, a buzz. */
function ring(t: Timer, open: (href: string, inBake: boolean) => void) {
  // A browser that blocks autoplay still gets the speech, the notification and the flash.
  attempt(() => void new Audio('/alarm.mp3').play().catch(() => undefined));

  attempt(() => {
    if (window.speechSynthesis && ttsEnabled()) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${t.name} timer has completed.`));
    }
  });

  // The notification says what is done and, pressed, opens the step (change 31).
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = `${t.name} is up`;
    const body = t.from ? `Tap to go back to step ${t.from.step}.` : 'Back to the kitchen.';
    try {
      const note = new Notification(title, { body });
      const from = t.from;
      if (from) {
        note.onclick = () => {
          window.focus();
          // Already in that bake: move the step in place, keeping how it was reached.
          const href = timerHref(from);
          open(href, window.location.pathname === href.split('?')[0]);
          note.close();
        };
      }
    } catch {
      // Chrome on Android shows notifications only through the service worker.
      void navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body })).catch(() => undefined);
    }
  }

  if (hapticsEnabled()) {
    const buzz = () => attempt(() => void Haptics.impact({ style: ImpactStyle.Heavy })?.catch(() => undefined));
    buzz();
    [200, 400, 600].forEach((ms) => setTimeout(buzz, ms));
  }
}

export default function TimerManager() {
  const [timers, setTimersState] = useState<Timer[]>(loadTimers);
  const timersRef = useRef(timers);
  const setTimers = (next: Timer[] | ((prev: Timer[]) => Timer[])) =>
    setTimersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      timersRef.current = value;
      saveTimers(value);
      return value;
    });
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { session } = useSession();
  const accountId = session.user?.id ?? null;
  const [now, setNow] = useState(Date.now());
  const [pendingTimer, setPendingTimer] = useState<{ durationSecs: number, name: string, from?: TimerOrigin } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  // The timers' own sheet, opened from the pill when no bake is open.
  const [listOpen, setListOpen] = useState(false);
  // The websocket used to be opened at module scope, so every page load connected
  // one and nothing ever closed it. Own it here so it's torn down on unmount.
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = accountId ? userToken() : null;
    if (!token) return;
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;
    // Timers started on this device before it connected join the account's list.
    socket.on('connect', () => socket.emit('timers:merge', timersRef.current.map(forServer)));
    socket.on('timers:sync', (serverTimers: Timer[]) => setTimers((prev) => keepOrigins(serverTimers, prev)));
    return () => {
      socket.off('connect');
      socket.off('timers:sync');
      socket.disconnect();
      socketRef.current = null;
    };
    // setTimers is stable in behaviour; the socket follows the account alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  /*
   * A timer reaching zero is marked rung first — saved, so a reload never
   * rings it again — and only then rings. The ringing used to run inside the
   * state update, during render, so one alarm that threw (a browser that
   * refuses `new Notification`) took the whole app down, and the unsaved
   * timer brought it down again on every reload.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const at = Date.now();
      setNow(at);
      const due = timersRef.current.filter((t) => t.endTime !== null && !t.hasRung && at >= t.endTime);
      if (due.length === 0) return;
      const rung = new Set(due.map((t) => t.id));
      setTimers((prev) => prev.map((t) => (rung.has(t.id) ? { ...t, hasRung: true } : t)));
      for (const t of due) {
        socketRef.current?.emit('timer:update', forServer({ ...t, hasRung: true }));
        ring(t, (href, inBake) =>
          inBake ? navigateRef.current(href, { replace: true, state: window.history.state?.usr }) : navigateRef.current(href),
        );
      }
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 1500);
    }, 1000);
    return () => clearInterval(interval);
    // setTimers is stable in behaviour; the clock is set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleAddTimer = (e: any) => {
      const { durationSecs, name, forceStart, from } = e.detail;
      if (forceStart) {
        confirmAddTimer(durationSecs, name, from);
      } else {
        setPendingTimer({ durationSecs, name, from });
      }
    };

    const handleStopAlarms = () => {
      setTimers((prev) => {
        const keep = prev.filter((t) => t.remainingMs >= 0 && (t.endTime === null || t.endTime >= Date.now()));
        prev.filter((t) => !keep.includes(t)).forEach((t) => socketRef.current?.emit('timer:remove', t.id));
        return keep;
      });
    };

    const handleOpenList = () => setListOpen(true);

    window.addEventListener('add-timer', handleAddTimer);
    window.addEventListener('stop-alarms', handleStopAlarms);
    window.addEventListener(OPEN_TIMERS_EVENT, handleOpenList);
    return () => {
      window.removeEventListener('add-timer', handleAddTimer);
      window.removeEventListener('stop-alarms', handleStopAlarms);
      window.removeEventListener(OPEN_TIMERS_EVENT, handleOpenList);
    };
  }, []);

  /*
   * Publish a read-only view of the timers for surfaces that display but do not
   * own them — Baking Mode docks these as segment readouts in its own header,
   * because a floating stack over a full-screen overlay sits on top of the step
   * a baker is reading. `now` is a dependency so the published remaining time
   * ticks with the clock rather than only when a timer is added or paused.
   */
  useEffect(() => {
    publishRunningTimers(
      timers.map((t) => ({
        id: t.id,
        name: t.name,
        remainingMs: t.endTime !== null ? t.endTime - now : t.remainingMs,
        running: t.endTime !== null,
      })),
    );
  }, [timers, now]);

  const confirmAddTimer = (durationSecs: number, name: string, from?: TimerOrigin) => {
    const newTimer: Timer = {
      id: ulid(),
      name,
      endTime: Date.now() + durationSecs * 1000,
      remainingMs: durationSecs * 1000,
      hasRung: false,
      ...(from ? { from } : {}),
    };
    setTimers((prev) => [...prev, newTimer]);
    socketRef.current?.emit('timer:add', forServer(newTimer));
    setPendingTimer(null);
  };

  const togglePause = (id: string) => {
    const t = timers.find(x => x.id === id);
    if (!t) return;
    
    let updatedTimer;
    if (t.endTime !== null) {
      const rem = t.endTime - Date.now();
      updatedTimer = { ...t, endTime: null, remainingMs: rem };
    } else {
      updatedTimer = { ...t, endTime: Date.now() + t.remainingMs };
    }
    setTimers((prev) => prev.map((x) => (x.id === id ? updatedTimer : x)));
    socketRef.current?.emit('timer:update', forServer(updatedTimer));
  };

  const removeTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    socketRef.current?.emit('timer:remove', id);
  };

  if (timers.length === 0 && !pendingTimer && !isFlashing) return null;

  return (
    <>
      {/*
        * The running timers. They used to float as a stack of panels over
        * whatever screen was open; the pill at the top of the screen now
        * reports them, and this sheet is where they are paused and removed.
        * A timer past its end keeps the butter of every timer and counts up
        * with a minus sign.
        */}
      <Sheet open={listOpen && timers.length > 0} onClose={() => setListOpen(false)} title="Timers" placement="bottom">
        <ul className="flex flex-col" aria-label="Running timers">
          {timers.map((t) => {
            const currentRemaining = t.endTime !== null ? t.endTime - now : t.remainingMs;
            const isNegative = currentRemaining < 0;
            const paused = t.endTime === null;
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-rule py-2 last:border-b-0">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[0.9375rem] text-ink">
                    {t.name}
                    {paused ? <span className="text-ink-muted"> · paused</span> : null}
                  </span>
                  <Readout
                    value={formatTimerClock(currentRemaining).replace(/^-/, '−')}
                    size="md"
                    label={isNegative ? 'Over by' : undefined}
                    className="mt-1 self-start rounded-control bg-butter px-2 py-1"
                  />
                </div>
                <IconButton
                  label={paused ? `Resume ${t.name} timer` : `Pause ${t.name} timer`}
                  icon={paused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
                  onClick={() => togglePause(t.id)}
                />
                <IconButton
                  label={`Remove ${t.name} timer`}
                  icon={<X className="h-5 w-5" aria-hidden="true" />}
                  onClick={() => removeTimer(t.id)}
                />
              </li>
            );
          })}
        </ul>
      </Sheet>
      {isFlashing && (
        <div className="fixed inset-0 z-[9999] bg-ink/30 dark:bg-paper pointer-events-none animate-pulse transition-opacity duration-300" />
      )}

      <Sheet
        open={!!pendingTimer}
        onClose={() => setPendingTimer(null)}
        title="Start timer"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="lg" onClick={() => setPendingTimer(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="min-w-32"
              onClick={() => pendingTimer && confirmAddTimer(pendingTimer.durationSecs, pendingTimer.name, pendingTimer.from)}
            >
              Start
            </Button>
          </>
        }
      >
        {pendingTimer ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-muted">
              Start a timer for <strong className="font-medium text-ink">{pendingTimer.name}</strong>?
            </p>
            <Readout value={formatTimerClock(pendingTimer.durationSecs * 1000)} size="lg" tone="ink" />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
