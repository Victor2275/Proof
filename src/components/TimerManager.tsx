import { useState, useEffect } from 'react';
import { Play, Pause, X, Bell } from 'lucide-react';

export interface Timer {
  id: string;
  name: string;
  endTime: number | null; // null if paused
  remainingMs: number; // amount left if paused, or used for negative tracking
  hasRung: boolean;
}

export default function TimerManager() {
  const [timers, setTimers] = useState<Timer[]>(() => {
    const saved = localStorage.getItem('baking-timers');
    return saved ? JSON.parse(saved) : [];
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem('baking-timers', JSON.stringify(timers));
  }, [timers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      
      // Check for alarms
      setTimers(prev => prev.map(t => {
        if (t.endTime !== null && !t.hasRung && Date.now() >= t.endTime) {
          // Play sound
          const audio = new Audio('/alarm.mp3'); // We'll assume this file exists or browser handles it
          audio.play().catch(e => console.error("Audio play failed:", e));
          
          if (Notification.permission === 'granted') {
            new Notification(`Timer Finished!`, { body: `${t.name} has finished.` });
          }
          return { ...t, hasRung: true };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleAddTimer = (e: any) => {
      const { durationSecs, name } = e.detail;
      const newTimer: Timer = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        endTime: Date.now() + durationSecs * 1000,
        remainingMs: durationSecs * 1000,
        hasRung: false
      };
      setTimers(prev => [...prev, newTimer]);
    };

    window.addEventListener('add-timer', handleAddTimer);
    return () => window.removeEventListener('add-timer', handleAddTimer);
  }, []);

  const togglePause = (id: string) => {
    setTimers(prev => prev.map(t => {
      if (t.id === id) {
        if (t.endTime !== null) {
          // Pause it
          const rem = t.endTime - Date.now();
          return { ...t, endTime: null, remainingMs: rem };
        } else {
          // Resume it
          return { ...t, endTime: Date.now() + t.remainingMs };
        }
      }
      return t;
    }));
  };

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
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

  if (timers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-h-[80vh] overflow-y-auto w-72">
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
  );
}
