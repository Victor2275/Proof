import { useState } from 'react';
import { cn } from '../../lib/cn';

/*
 * The plate — a photograph mounted on the faceplate.
 *
 * The direction contract assumed uneven photo coverage and concluded that no
 * photograph was required for a row to read. The live library says otherwise:
 * every recipe carries exactly one final-product shot, and none carries two.
 * Coverage is uniform, so the defensive posture was paying for a cold first
 * screen to solve a problem that does not exist.
 *
 * What it is not: a card. No shadow, no floating, no gradient scrim over the
 * image (the scrim is a ban in this world anyway). The plate sits inside the
 * panel's own hairline rule, square, like a specimen mounted for inspection —
 * which is also why it never crops to a circle or a soft-cornered tile.
 *
 * What it is not, second: load-bearing. A missing, empty or broken image
 * degrades to an unlit plate at exactly the same size, so the row's geometry
 * never shifts and the pattern beside it still reads on its own. If every URL
 * in the database went dead tomorrow the dashboard would look deliberate.
 */

export type PlateSize = 'row' | 'tile' | 'hero';

const SIZE: Record<PlateSize, string> = {
  /** Beside a pattern row in the dashboard list. */
  row: 'h-16 w-16 sm:h-20 sm:w-20',
  /** On a smart-shelf tile. */
  tile: 'h-32 w-full',
  /** The framed plate on a recipe, which leads with its title, not its photo. */
  hero: 'aspect-square w-full',
};

export interface RecipePlateProps {
  src?: string;
  /** The recipe's title — the plate is named by what it shows. */
  alt: string;
  size?: PlateSize;
  className?: string;
}

export function RecipePlate({ src, alt, size = 'row', className }: RecipePlateProps) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-key border border-rule bg-panel-sunk',
        SIZE[size],
        className,
      )}
    >
      {usable ? (
        <img
          src={src}
          alt={alt}
          // Two hundred rows of photographs is two hundred requests the list
          // does not need up front; the browser's own lazy loading keeps the
          // first paint to what is actually on screen.
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        /*
         * The unlit plate. Empty, but drawn — the same treatment an unlit step
         * key gets, so an absent photo reads as a slot with nothing in it
         * rather than as a broken image.
         */
        <div className="h-full w-full bg-key-unlit" role="presentation" />
      )}
    </div>
  );
}
