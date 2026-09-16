import { cn } from '../../lib/cn';
import { phaseState, type Phase, type PhaseState } from '../../lib/phases';

/*
 * The step row — the one component the whole world is named for.
 *
 * Each key is a phase of the bake. Colour here is temporal, never decorative:
 * red is now, orange is due next, yellow is queued, bone is complete, and an
 * unlit key is a phase not yet reached. A recipe with no bake running renders
 * entirely unlit, which is the row at rest and reads as an invitation rather
 * than as missing data.
 *
 * The row never wraps; it scales. On a narrow screen the keys get thinner and
 * the labels drop, but the shape of the bake stays one unbroken line.
 */

const KEY_TONE: Record<PhaseState, string> = {
  now: 'bg-key-now',
  due: 'bg-key-due',
  queued: 'bg-key-queued',
  done: 'bg-key-done',
  // `key-unlit` (#2A2A2A) and the rule token (#2E2E2E) sit only four steps
  // apart in the dark theme — nearly the same grey — so an idle key filled
  // flat against a true-black page dissolves into an unbroken smear instead
  // of reading as a designed, empty slot. A low-opacity ink-muted border
  // draws its edge without giving idle keys the same flat-block weight the
  // lit states earn.
  idle: 'bg-key-unlit border border-ink-muted/20',
};

/*
 * Labels are printed beneath the keys on the panel ground, never on the key
 * itself — which is how the machine does it, and which keeps label contrast
 * constant instead of making it a function of whichever colour the key is
 * currently showing.
 */
const LABEL_TONE: Record<PhaseState, string> = {
  now: 'text-signal',
  due: 'text-ink',
  queued: 'text-silkscreen',
  done: 'text-silkscreen',
  idle: 'text-silkscreen',
};

export interface StepRowProps {
  phases: Phase[];
  /** Index of the instruction step running now; omit for a row at rest. */
  activeStep?: number;
  /**
   * `mini` is the dashboard signature: unlabelled keys that let a recipe read
   * at a glance without needing a photograph. `full` is the labelled,
   * selectable row used on a recipe and in Baking Mode.
   */
  size?: 'mini' | 'full';
  onSelect?: (phase: Phase) => void;
  className?: string;
  /** Accessible name; the row is a group of controls, not decoration. */
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
    // Sixteen dark keys of invitation: an empty pattern is still a pattern.
    return (
      <div
        className={cn('flex w-full gap-px', size === 'mini' ? 'h-2' : 'h-14', className)}
        role="img"
        aria-label="No phases yet"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-key bg-key-unlit border border-ink-muted/20" />
        ))}
      </div>
    );
  }

  const interactive = Boolean(onSelect) && size === 'full';
  const running = phases.find((p) => phaseState(p, activeStep) === 'now');

  const keys = (
    <div
      className={cn('flex w-full gap-px')}
      role={interactive ? 'group' : 'img'}
      aria-label={interactive ? label : `${label}: ${phases.map((p) => p.label).join(', ')}`}
    >
      {phases.map((phase) => {
        const state = phaseState(phase, activeStep);
        // Mini keys are 8px tall: they carry state by colour alone. Only the
        // full key has room for a foot indicator.
        const body =
          size === 'full' ? (
            /* The foot indicator: lit on the running phase, dark otherwise.
             * It is what makes a key read as a key rather than a swatch. */
            <span
              className={cn(
                'pointer-events-none absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2',
                state === 'now' ? 'bg-white' : 'bg-black/40',
              )}
            />
          ) : null;

        const shared = cn(
          'relative flex flex-1 items-center justify-center rounded-key transition-colors',
          size === 'mini' ? 'h-2 min-w-1.5' : 'h-14 min-w-6',
          KEY_TONE[state],
          state === 'now' && 'ring-1 ring-inset ring-white/70',
        );

        if (!interactive) {
          return (
            <div key={phase.id} className={shared} title={phase.label}>
              {body}
            </div>
          );
        }

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onSelect?.(phase)}
            className={cn(shared, 'cursor-pointer hover:brightness-110')}
            aria-current={state === 'now' ? 'step' : undefined}
          >
            {body}
            <span className="sr-only">
              {phase.label}
              {state === 'now' ? ' — running now' : state === 'done' ? ' — complete' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (size === 'mini') return <div className={className}>{keys}</div>;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/*
       * Narrow screens cannot fit eight labels — at 390px "LEVAIN" truncates to
       * "LE…", which is worse than no label. Below `sm` the row names only the
       * phase that is running, above the keys, and the per-key labels drop.
       */}
      {running ? (
        <span className="label-silkscreen text-signal sm:hidden">{running.label} — now</span>
      ) : null}

      {keys}

      <div className="hidden w-full gap-px sm:flex" aria-hidden="true">
        {phases.map((phase) => (
          <span
            key={phase.id}
            className={cn(
              'label-silkscreen min-w-6 flex-1 truncate text-center',
              LABEL_TONE[phaseState(phase, activeStep)],
            )}
          >
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  );
}
