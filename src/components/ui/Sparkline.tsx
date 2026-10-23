import { cn } from '../../lib/cn';

/*
 * How a recipe's bakes have gone, oldest to newest, as one small line
 * (change 104). Drawn only from three rated bakes up: two points are a pair,
 * not a trend, and the page says nothing rather than draw one.
 *
 * One series, so no legend: the line is ink on the paper's own axis, 2px,
 * ending in a dot on the latest bake. The scale is the stars' own, one to
 * five, so a flat line at four means four, not "the middle of the chart".
 * Every rating is in the accessible name, and each point carries its value as
 * a hover title.
 */
export interface SparklineProps {
  /** Ratings, oldest first. */
  values: number[];
  /** What the values are, for the accessible name: "Cheesecake". */
  label: string;
  className?: string;
}

const SPARKLINE_MIN = 3;

const W = 88;
const H = 24;
const PAD = 3;

export function Sparkline({ values, label, className }: SparklineProps) {
  if (values.length < SPARKLINE_MIN) return null;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (values.length - 1);
  const y = (v: number) => H - PAD - ((v - 1) * (H - PAD * 2)) / 4;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastIndex = values.length - 1;

  return (
    <svg
      role="img"
      aria-label={`${label}, stars over ${values.length} bakes, oldest first: ${values.join(', ')}`}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={cn('shrink-0 overflow-visible text-ink-2', className)}
    >
      {/* The one and five lines, faint, so the line's height reads as stars. */}
      <line x1={PAD} x2={W - PAD} y1={y(1)} y2={y(1)} className="stroke-rule" strokeWidth={1} />
      <line x1={PAD} x2={W - PAD} y1={y(5)} y2={y(5)} className="stroke-rule" strokeWidth={1} />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === lastIndex ? 3.5 : 6} fill={i === lastIndex ? 'currentColor' : 'transparent'}>
          <title>{`Bake ${i + 1}: ${v} ${v === 1 ? 'star' : 'stars'}`}</title>
        </circle>
      ))}
    </svg>
  );
}
