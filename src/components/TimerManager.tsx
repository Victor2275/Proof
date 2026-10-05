import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../lib/api';
import { hapticsEnabled, ttsEnabled } from '../lib/settings';
import { publishRunningTimers, formatTimerClock } from '../lib/timerBus';
import { Button, SegmentReadout, Sheet, cn } from './ui';

export interface Timer {
  id: string;
  name: string;
  endTime: number | null;
  remainingMs: number;
  hasRung: boolean;
}

const socketUrl = API_URL.replace('/api', '');

export default function TimerManager() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [pendingTimer, setPendingTimer] = useState<{ durationSecs: number, name: string } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  // The websocket used to be opened at module scope, so every page load connected
  // one and nothing ever closed it. Own it here so it's torn down on unmount.
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(socketUrl);
    socketRef.current = socket;
    socket.on('timers:sync', (serverTimers: Timer[]) => {
      setTimers(serverTimers);
    });
    return () => {
      socket.off('timers:sync');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

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
      setTimers(prev => prev.filter(t => t.remainingMs >= 0 && (t.endTime === null || t.endTime >= Date.now())));
    };

    window.addEventListener('add-timer', handleAddTimer);
    window.addEventListener('stop-alarms', handleStopAlarms);
    return () => {
      window.removeEventListener('add-timer', handleAddTimer);
      window.removeEventListener('stop-alarms', handleStopAlarms);
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
      id: Math.random().toString(36).substr(2, 9),
      name,
      endTime: Date.now() + durationSecs * 1000,
      remainingMs: durationSecs * 1000,
      hasRung: false
    };
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
    socketRef.current?.emit('timer:update', updatedTimer);
  };

  const removeTimer = (id: string) => {
    socketRef.current?.emit('timer:remove', id);
  };

  if (timers.length === 0 && !pendingTimer) return null;

  return (
    <>
      {/*
        * The running timers, docked as small panels. Each reads its time on a
        * segment display, as every instrument value in the app does; a timer
        * past zero lights its display and its rule, rather than flooding the
        * whole panel red.
        */}
      <div className="fixed top-16 right-4 md:top-auto md:bottom-4 z-50 flex flex-col gap-2 max-h-[80vh] overflow-y-auto w-72" aria-label="Timers">
        {timers.map(t => {
          const currentRemaining = t.endTime !== null ? t.endTime - now : t.remainingMs;
          const isNegative = currentRemaining < 0;
          const paused = t.endTime === null;

          return (
            <section
              key={t.id}
              className={cn(
                'flex flex-col rounded-panel border bg-panel faceplate',
                isNegative ? 'border-signal' : 'border-rule',
              )}
            >
              <header className={cn('flex items-center justify-between gap-2 border-b pl-3', isNegative ? 'border-signal' : 'border-rule')}>
                <h2 className="label-silkscreen min-w-0 truncate">
                  {t.name}
                  {paused ? ' · paused' : ''}
                </h2>
                <button
                  type="button"
                  onClick={() => removeTimer(t.id)}
                  aria-label={`Remove ${t.name} timer`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </header>

              <div className="flex items-center justify-between gap-3 py-2 pl-3 pr-1">
                <SegmentReadout
                  value={formatTimerClock(currentRemaining)}
                  size="md"
                  tone={isNegative ? 'signal' : 'ink'}
                  label={isNegative ? 'Overtime' : undefined}
                />
                <button
                  type="button"
                  onClick={() => togglePause(t.id)}
                  aria-label={paused ? `Resume ${t.name} timer` : `Pause ${t.name} timer`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule text-ink transition-colors hover:border-ink"
                >
                  {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </section>
          );
        })}
      </div>

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
            <SegmentReadout value={formatTimerClock(pendingTimer.durationSecs * 1000)} size="lg" tone="ink" />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
