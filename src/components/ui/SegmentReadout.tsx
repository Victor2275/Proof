import { cn } from '../../lib/cn';

/*
 * A true seven-segment readout, ghost cells included.
 *
 * The world's rule is that unlit segments are designed as deliberately as lit
 * ones, so every digit renders all seven segments and dims the ones that are
 * off. That is what separates this from a font that merely looks digital: the
 * "1" still occupies a full eight-cell mask, and the display has a physical
 * width that does not shift as the value changes.
 *
 * Reserved for instrument values — timers, temperatures, weights, hydration.
 * Counts, servings and dates use tabular mono; spending segments on every
 * number would spend the effect and cost legibility in dense lists.
 */

/** Which of the seven segments are lit for each character. */
const GLYPHS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcfgd',
  '-': 'g',
  ' ': '',
};

/** Segment polygons on a 0 0 60 100 grid, bevelled like a moulded cell. */
const SEGMENTS: Record<string, string> = {
  a: '10,4 50,4 44,12 16,12',
  b: '52,6 56,14 52,44 46,40 46,14',
  c: '52,56 56,86 52,94 46,86 46,60',
  d: '16,88 44,88 50,96 10,96',
  e: '8,56 14,60 14,86 8,94 4,86',
  f: '8,6 14,14 14,40 8,44 4,14',
  g: '16,46 44,46 50,50 44,54 16,54',
};

const SIZES = {
  sm: { height: 18, gap: 2 },
  md: { height: 28, gap: 3 },
  lg: { height: 48, gap: 5 },
  xl: { height: 84, gap: 8 },
} as const;

export type SegmentSize = keyof typeof SIZES;

function Digit({ char, height, tone }: { char: string; height: number; tone: string }) {
  const lit = GLYPHS[char] ?? '';
  return (
    <svg
      viewBox="0 0 60 100"
      height={height}
      width={(height * 60) / 100}
      aria-hidden="true"
      focusable="false"
      className="shrink-0 overflow-visible"
    >
      {Object.entries(SEGMENTS).map(([name, points]) => (
        <polygon
          key={name}
          points={points}
          className={lit.includes(name) ? tone : 'fill-key-unlit'}
        />
      ))}
    </svg>
  );
}

/** The colon and decimal point get their own narrow cells, as on the panel. */
function Punctuation({ char, height, tone }: { char: string; height: number; tone: string }) {
  return (
    <svg
      viewBox="0 0 20 100"
      height={height}
      width={(height * 20) / 100}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {char === ':' ? (
        <>
          <rect x="4" y="30" width="12" height="12" className={tone} />
          <rect x="4" y="60" width="12" height="12" className={tone} />
        </>
      ) : (
        <rect x="4" y="82" width="12" height="12" className={tone} />
      )}
    </svg>
  );
}

export interface SegmentReadoutProps {
  /** The value as it should read, e.g. "12:40", "78.5", 450. */
  value: string | number;
  /** Silkscreened unit printed beside the display, e.g. "MIN", "%", "°F". */
  unit?: string;
  size?: SegmentSize;
  /** `signal` is the lit-LED red; `ink` is a bone readout for quieter contexts. */
  tone?: 'signal' | 'ink';
  /** Silkscreened caption above the display. */
  label?: string;
  className?: string;
}

export function SegmentReadout({
  value,
  unit,
  size = 'md',
  tone = 'signal',
  label,
  className,
}: SegmentReadoutProps) {
  const { height, gap } = SIZES[size];
  const fill = tone === 'signal' ? 'fill-signal' : 'fill-ink';
  const text = String(value);

  return (
    /*
     * The readout is one value to a screen reader, not a row of glyphs — and
     * its silkscreened caption is part of that value. A display reading 1:15
     * under a "TOTAL" label means "total, 1:15"; announcing the caption and
     * the number as two unrelated pieces of text leaves it to the listener to
     * guess which display the number belonged to.
     */
    <div
      className={cn('inline-flex flex-col gap-1', className)}
      role="img"
      aria-label={[label, text, unit].filter(Boolean).join(' ')}
    >
      {label ? (
        <span className="label-silkscreen" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <div className="inline-flex items-end" style={{ gap }}>
        <span className="inline-flex items-end" style={{ gap }} aria-hidden="true">
          {text.split('').map((char, i) =>
            char === ':' || char === '.' ? (
              <Punctuation key={i} char={char} height={height} tone={fill} />
            ) : (
              <Digit key={i} char={char} height={height} tone={fill} />
            ),
          )}
        </span>
        {unit ? (
          <span className="label-silkscreen pb-0.5" aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}
