import { useState, useEffect } from 'react';
import { Play, Pause, X, Bell } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { io } from 'socket.io-client';
import { API_URL } from '../lib/api';

export interface Timer {
  id: string;
  name: string;
  endTime: number | null;
  remainingMs: number;
  hasRung: boolean;
}

const socketUrl = API_URL.replace('/api', '');
const socket = io(socketUrl);

export default function TimerManager() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [pendingTimer, setPendingTimer] = useState<{ durationSecs: number, name: string } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    socket.on('timers:sync', (serverTimers: Timer[]) => {
      setTimers(serverTimers);
    });
    return () => {
      socket.off('timers:sync');
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      
      setTimers(prev => prev.map(t => {
        if (t.endTime !== null && !t.hasRung && Date.now() >= t.endTime) {
          const audio = new Audio('/alarm.mp3');
          audio.play().catch(e => console.error("Audio play failed:", e));
          
          if (window.speechSynthesis && localStorage.getItem('audioAnnouncementsEnabled') !== 'false') {
            const msg = new SpeechSynthesisUtterance(`${t.name} timer has completed.`);
            window.speechSynthesis.speak(msg);
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Timer Finished!`, { body: `${t.name} has finished.` });
          }

          try {
            Haptics.impact({ style: ImpactStyle.Heavy });
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 400);
            setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 600);
          } catch(e) {}

          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 1500);

          const updatedTimer = { ...t, hasRung: true };
          socket.emit('timer:update', updatedTimer);
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

  const confirmAddTimer = (durationSecs: number, name: string) => {
    const newTimer: Timer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      endTime: Date.now() + durationSecs * 1000,
      remainingMs: durationSecs * 1000,
      hasRung: false
    };
    socket.emit('timer:add', newTimer);
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
    socket.emit('timer:update', updatedTimer);
  };

  const removeTimer = (id: string) => {
    socket.emit('timer:remove', id);
  };

  const formatTime = (ms: number) => {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const totalSec = Math.floor(absMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    let res = '';
    if (h > 0) res += `${h}:`;
    res += `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return isNegative ? `+${res}` : res;
  };

  if (timers.length === 0 && !pendingTimer) return null;

  return (
    <>
      <div className="fixed top-16 right-4 md:top-auto md:bottom-4 z-50 flex flex-col gap-2 max-h-[80vh] overflow-y-auto w-72">
        {timers.map(t => {
          let currentRemaining = t.remainingMs;
          if (t.endTime !== null) {
            currentRemaining = t.endTime - now;
          }

          const isNegative = currentRemaining < 0;

          return (
            <div key={t.id} className={`p-3 rounded-lg shadow-xl border flex flex-col gap-2 ${isNegative ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-paper text-ink border-border-subtle'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm truncate pr-2">{t.name}</span>
                <button onClick={() => removeTimer(t.id)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-bold tracking-wider">
                  {formatTime(currentRemaining)}
                </span>
                
                <button onClick={() => togglePause(t.id)} className={`p-2 rounded-full ${isNegative ? 'hover:bg-black/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  {t.endTime === null ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              </div>
              {isNegative && <div className="text-xs font-bold uppercase tracking-widest text-center mt-1 flex items-center justify-center gap-1"><Bell className="w-3 h-3" /> Overtime</div>}
            </div>
          );
        })}
      </div>

      {isFlashing && (
        <div className="fixed inset-0 z-[9999] bg-ink/30 dark:bg-paper/30 pointer-events-none animate-pulse transition-opacity duration-300" />
      )}

      {pendingTimer && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in slide-in-from-bottom md:slide-in-from-bottom-4">
          <div className="bg-paper w-full md:max-w-sm md:rounded-2xl rounded-t-3xl shadow-2xl p-6 pb-safe">
            <h3 className="text-xl font-bold mb-2">Start Timer</h3>
            <p className="text-ink-muted mb-6">
              Start a timer for <strong className="text-ink">{pendingTimer.name}</strong> ({formatTime(pendingTimer.durationSecs * 1000)})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingTimer(null)} className="flex-1 py-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={() => confirmAddTimer(pendingTimer.durationSecs, pendingTimer.name)} className="flex-1 bg-ink text-paper py-3 font-bold rounded-xl hover:opacity-90 transition-opacity">
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
