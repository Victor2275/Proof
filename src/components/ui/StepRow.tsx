import { cn } from '../../lib/cn';
import { phaseState, type Phase, type PhaseState } from '../../lib/phases';

/*
 * The phases of a bake as one thin line: Levain · Mix · Bulk · Shape · Bake.
 *
 * Each phase is a segment of the line. The one running now is paprika, the
 * ones finished are ink, the next one is butter, and the rest are a pale rule
 * — so "where am I" reads at a glance across a counter without a legend. A
 * recipe with no bake running draws the whole line at rest.
 *
 * Selectable phases are 44px-tall targets around a 6px line: the target is
 * for the thumb, the line is for the eye.
 */

const SEGMENT_TONE: Record<PhaseState, string> = {
  now: 'bg-key-now',
  due: 'bg-key-due',
  queued: 'bg-key-queued',
  done: 'bg-key-done',
  idle: 'bg-key-unlit',
};

const LABEL_TONE: Record<PhaseState, string> = {
  now: 'text-ink font-semibold',
  due: 'text-ink-2',
  queued: 'text-ink-muted',
  done: 'text-ink-muted',
  idle: 'text-ink-muted',
};

export interface StepRowProps {
  phases: Phase[];
  /** Index of the instruction step running now; omit for a line at rest. */
  activeStep?: number;
  /**
   * `mini` is a hairline with no labels, for a tile or a list row. `full` is
   * the labelled, optionally selectable line used on a recipe and in Baking
   * Mode.
   */
  size?: 'mini' | 'full';
  onSelect?: (phase: Phase) => void;
  className?: string;
  /** Accessible name; a selectable line is a group of controls. */
  label?: string;
}

export function StepRow({
  phases,
  activeStep,
  size = 'full',
  onSelect,
  className,
  label = 'Bake phases',
}: StepRowProps) {
  if (phases.length === 0) {
    return (
      <div
        className={cn('w-full rounded-full bg-key-unlit', size === 'mini' ? 'h-1' : 'h-1.5', className)}
        role="img"
        aria-label="No phases yet"
      />
    );
  }

  const interactive = Boolean(onSelect) && size === 'full';
  const running = phases.find((p) => phaseState(p, activeStep) === 'now');

  const line = (
    <div
      className={cn('flex w-full', size === 'mini' ? 'gap-0.5' : 'gap-1')}
      role={interactive ? 'group' : 'img'}
      aria-label={interactive ? label : `${label}: ${phases.map((p) => p.label).join(', ')}`}
    >
      {phases.map((phase) => {
        const state = phaseState(phase, activeStep);
        const bar = cn(
          'block w-full rounded-full transition-colors duration-200',
          size === 'mini' ? 'h-1' : 'h-1.5',
          SEGMENT_TONE[state],
        );

        if (!interactive) {
          return <span key={phase.id} className={cn(bar, 'flex-1')} title={phase.label} />;
        }

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onSelect?.(phase)}
            className="pressable flex h-11 min-w-6 flex-1 items-center rounded-control px-0.5 hover:bg-paper-sunk"
            aria-current={state === 'now' ? 'step' : undefined}
          >
            <span className={bar} aria-hidden="true" />
            <span className="sr-only">
              {phase.label}
              {state === 'now' ? ' — running now' : state === 'done' ? ' — complete' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (size === 'mini') return <div className={className}>{line}</div>;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/*
       * A phone cannot fit every label under its segment, so below `sm` the
       * line names only the phase that is running, above it.
       */}
      {running ? (
        <span className="text-sm text-ink-2 sm:hidden">
          <span className="font-semibold text-ink">{running.label}</span> · now
        </span>
      ) : null}

      {line}

      <div className={cn('hidden w-full sm:flex', 'gap-1')} aria-hidden="true">
        {phases.map((phase) => (
          <span
            key={phase.id}
            className={cn('min-w-6 flex-1 truncate text-center text-xs', LABEL_TONE[phaseState(phase, activeStep)])}
          >
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  );
}
