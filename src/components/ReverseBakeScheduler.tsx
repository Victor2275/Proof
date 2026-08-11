import { useState, useMemo } from 'react';
import { type Recipe } from '../lib/api';
import { Calendar, Bell, Check, X } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface ReverseBakeSchedulerProps {
  recipe: Recipe;
  onClose?: () => void;
}

export interface ScheduleStep {
  stepIndex: number;
  text: string;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
}

export default function ReverseBakeScheduler({ recipe, onClose }: ReverseBakeSchedulerProps) {
  const defaultTarget = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0); // Tomorrow at 9:00 AM
    return d.toISOString().slice(0, 16);
  }, []);

  const [targetDateTime, setTargetDateTime] = useState(defaultTarget);
  const [scheduled, setScheduled] = useState(false);

  const scheduleSteps = useMemo<ScheduleStep[]>(() => {
    if (!recipe.instructions || recipe.instructions.length === 0) return [];
    const targetDate = new Date(targetDateTime);
    if (isNaN(targetDate.getTime())) return [];

    // Parse prep & cook time as fallback step durations
    const totalPrep = parseInt(recipe.prepTime) || 30;
    const totalCook = parseInt(recipe.cookTime) || 45;
    const perStepMinutes = Math.max(15, Math.round((totalPrep + totalCook) / recipe.instructions.length));

    // Calculate timelines backwards from targetDate
    let currentEnd = new Date(targetDate);
    const stepsReversed: ScheduleStep[] = [];

    for (let i = recipe.instructions.length - 1; i >= 0; i--) {
      const text = recipe.instructions[i];
      // Search text for timer patterns like (30m) or (2h)
      const timerMatch = text.match(/\((\d+)\s*(m|min|mins|h|hr|hours)\)/i);
      let stepMins = perStepMinutes;
      if (timerMatch) {
        const val = parseInt(timerMatch[1]);
        const unit = timerMatch[2].toLowerCase();
        stepMins = unit.startsWith('h') ? val * 60 : val;
      }

      const stepStart = new Date(currentEnd.getTime() - stepMins * 60 * 1000);

      stepsReversed.push({
        stepIndex: i,
        text,
        durationMinutes: stepMins,
        startTime: stepStart,
        endTime: new Date(currentEnd)
      });

      currentEnd = stepStart;
    }

    return stepsReversed.reverse();
  }, [recipe, targetDateTime]);

  const handleScheduleNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
      alert('Local notifications are active on native Android devices.');
      setScheduled(true);
      return;
    }

    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        alert('Notification permission required.');
        return;
      }

      const notifications = scheduleSteps.map((step, idx) => ({
        title: `Bake Step ${step.stepIndex + 1}: ${recipe.title}`,
        body: step.text,
        id: idx + 100,
        schedule: { at: step.startTime }
      }));

      await LocalNotifications.schedule({ notifications });
      setScheduled(true);
    } catch (err: any) {
      console.error('Notification error:', err);
      alert('Failed to schedule notifications.');
    }
  };

  return (
    <div className="bg-paper border border-border-subtle rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex justify-between items-center border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-ink" />
          <h2 className="text-xl font-bold uppercase tracking-wider">Reverse Bake Timeline Scheduler</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-sidebar p-4 rounded-xl border border-border-subtle">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted mb-1">
            Target Completion Time (Want to serve at)
          </label>
          <input
            type="datetime-local"
            value={targetDateTime}
            onChange={e => setTargetDateTime(e.target.value)}
            className="px-3 py-2 bg-paper border border-border-subtle rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <button
          onClick={handleScheduleNotifications}
          className="bg-ink text-paper px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-opacity"
        >
          {scheduled ? <Check className="w-4 h-4 text-green-400" /> : <Bell className="w-4 h-4" />}
          {scheduled ? 'Notifications Scheduled!' : 'Set Phone Notification Alerts'}
        </button>
      </div>

      {scheduleSteps.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
            Recommended Start Schedule (Working Backwards)
          </h3>

          <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {scheduleSteps.map((step) => {
              const startStr = step.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = step.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div key={step.stepIndex} className="relative pl-10 flex items-start justify-between bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-subtle">
                  <div className="absolute left-2.5 top-5 w-3 h-3 rounded-full bg-ink -translate-x-1/2 ring-4 ring-paper" />
                  
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-ink-muted uppercase tracking-wider">
                      Step {step.stepIndex + 1} ({step.durationMinutes} mins)
                    </span>
                    <p className="font-semibold text-base text-ink">{step.text}</p>
                  </div>

                  <div className="text-right shrink-0 ml-4 font-mono">
                    <div className="font-bold text-base text-ink">{startStr}</div>
                    <div className="text-xs text-ink-muted">{dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
