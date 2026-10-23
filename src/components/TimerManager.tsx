import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../lib/api';
import { userToken, useSession } from '../lib/session';
import { ulid } from '../lib/ulid';
import { hapticsEnabled, ttsEnabled } from '../lib/settings';
import { publishRunningTimers, formatTimerClock, OPEN_TIMERS_EVENT } from '../lib/timerBus';
import { Button, IconButton, Readout, Sheet } from './ui';

export interface Timer {
  id: string;
  name: string;
  endTime: number | null;
  remainingMs: number;
  hasRung: boolean;
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
  const { session } = useSession();
  const accountId = session.user?.id ?? null;
  const [now, setNow] = useState(Date.now());
  const [pendingTimer, setPendingTimer] = useState<{ durationSecs: number, name: string } | null>(null);
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
    socket.on('connect', () => socket.emit('timers:merge', timersRef.current));
    socket.on('timers:sync', (serverTimers: Timer[]) => setTimers(serverTimers));
    return () => {
      socket.off('connect');
      socket.off('timers:sync');
      socket.disconnect();
      socketRef.current = null;
    };
    // setTimers is stable in behaviour; the socket follows the account alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      
      setTimers(prev => prev.map(t => {
        if (t.endTime !== null && !t.hasRung && Date.now() >= t.endTime) {
          const audio = new Audio('/alarm.mp3');
          // A browser that blocks autoplay still gets the speech, the
          // notification and the flash below.
          audio.play().catch(() => {});
          
          if (window.speechSynthesis && ttsEnabled()) {
            const msg = new SpeechSynthesisUtterance(`${t.name} timer has completed.`);
            window.speechSynthesis.speak(msg);
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Timer Finished!`, { body: `${t.name} has finished.` });
          }

          try {
            if (hapticsEnabled()) {
              Haptics.impact({ style: ImpactStyle.Heavy });
              setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
              setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 400);
              setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 600);
            }
          } catch(e) {}

          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 1500);

          const updatedTimer = { ...t, hasRung: true };
          socketRef.current?.emit('timer:update', updatedTimer);
          return updatedTimer;
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleAddTimer = (e: any) => {
      const { durationSecs, name, forceStart } = e.detail;
      if (forceStart) {
        confirmAddTimer(durationSecs, name);
      } else {
        setPendingTimer({ durationSecs, name });
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

  const confirmAddTimer = (durationSecs: number, name: string) => {
    const newTimer: Timer = {
      id: ulid(),
      name,
      endTime: Date.now() + durationSecs * 1000,
      remainingMs: durationSecs * 1000,
      hasRung: false
    };
    setTimers((prev) => [...prev, newTimer]);
    socketRef.current?.emit('timer:add', newTimer);
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
    socketRef.current?.emit('timer:update', updatedTimer);
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
              onClick={() => pendingTimer && confirmAddTimer(pendingTimer.durationSecs, pendingTimer.name)}
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
