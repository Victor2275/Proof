import { useState, useMemo } from 'react';
import { type Recipe } from '../lib/api';
import { Bell, Check, X } from 'lucide-react';
import { Button, Field, Panel } from './ui';
import { stepDurations, scheduleCaveat, type DurationSource } from '../lib/schedule';
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
  /** Whether the step named this time, shared the recipe's total, or was assumed. */
  source: DurationSource;
  startTime: Date;
  endTime: Date;
}

/*
 * A `datetime-local` input reads and writes wall-clock time with no zone. The
 * default used to come from toISOString(), which is UTC, so "tomorrow at 9:00"
 * appeared as 16:00 in California and 10:00 in Paris.
 */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReverseBakeScheduler({ recipe, onClose }: ReverseBakeSchedulerProps) {
  const defaultTarget = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0); // Tomorrow at 9:00 AM
    return toLocalInputValue(d);
  }, []);

  const [targetDateTime, setTargetDateTime] = useState(defaultTarget);
  const [scheduled, setScheduled] = useState(false);
  // Reported on the panel rather than through a browser dialog, which on a
  // phone is a system modal over a schedule the baker is reading.
  const [scheduleNotice, setScheduleNotice] = useState('');

  const scheduleSteps = useMemo<ScheduleStep[]>(() => {
    if (!recipe.instructions || recipe.instructions.length === 0) return [];
    const targetDate = new Date(targetDateTime);
    if (isNaN(targetDate.getTime())) return [];

    const durations = stepDurations(recipe);

    // Calculate timelines backwards from targetDate
    let currentEnd = new Date(targetDate);
    const stepsReversed: ScheduleStep[] = [];

    for (let i = recipe.instructions.length - 1; i >= 0; i--) {
      const text = recipe.instructions[i];
      const { minutes: stepMins, source } = durations[i];

      const stepStart = new Date(currentEnd.getTime() - stepMins * 60 * 1000);

      stepsReversed.push({
        stepIndex: i,
        text,
        durationMinutes: stepMins,
        source,
        startTime: stepStart,
        endTime: new Date(currentEnd)
      });

      currentEnd = stepStart;
    }

    return stepsReversed.reverse();
  }, [recipe, targetDateTime]);

  const caveat = useMemo(
    () => scheduleCaveat(scheduleSteps.map((step) => ({ minutes: step.durationMinutes, source: step.source }))),
    [scheduleSteps],
  );

  const handleScheduleNotifications = async () => {
    setScheduleNotice('');

    if (!Capacitor.isNativePlatform()) {
      setScheduleNotice('Alerts only fire in the installed Android app. The schedule below is still yours to work from.');
      setScheduled(true);
      return;
    }

    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        setScheduleNotice('Android has not granted notification permission. Allow it in the system settings for Proof, then press this again.');
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
    } catch {
      setScheduleNotice('The alerts could not be scheduled. The schedule below is unaffected.');
    }
  };

  return (
    <Panel
      title="Reverse bake schedule"
      actions={
        onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scheduler"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-control text-ink-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Field
            label="Target completion time"
            hint="When you want to serve it."
            type="datetime-local"
            value={targetDateTime}
            onChange={e => setTargetDateTime(e.target.value)}
            className="sm:w-64"
          />

          {/* Secondary: the scheduler opens inline on the recipe page, beside
            * Start Recipe, which is that screen's one red control. */}
          <Button
            variant="secondary"
            onClick={handleScheduleNotifications}
            icon={scheduled ? <Check className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
          >
            {scheduled ? 'Alerts set' : 'Alert me on my phone'}
          </Button>
        </div>

        {scheduleNotice ? (
          <p className="border-l border-rule pl-3 text-sm text-ink" role="status">
            {scheduleNotice}
          </p>
        ) : null}

        {scheduleSteps.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="label-silkscreen">Recommended start schedule (working backwards)</h3>
            {caveat ? (
              <p className="max-w-prose text-sm text-ink-muted" role="note">{caveat}</p>
            ) : null}

            {/* A printed timetable: the start time ranged left in mono, as a
              * clock would print it, and the step it starts beside it. */}
            <ol className="flex flex-col border-t border-rule">
              {scheduleSteps.map((step) => {
                const startStr = step.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = step.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                  <li key={step.stepIndex} className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-rule py-3">
                    <div className="flex flex-col font-mono tabular-nums">
                      <span className="text-ink">{startStr}</span>
                      <span className="text-xs text-ink-muted">{dateStr}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="label-silkscreen">
                        Step {step.stepIndex + 1} · {step.source === 'shared' ? '≈ ' : ''}{step.durationMinutes} min
                        {step.source === 'assumed' ? ' · assumed' : ''}
                      </span>
                      <p className="max-w-prose text-ink">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </Panel>
  );
}
