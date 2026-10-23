import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { usePhotoSrc } from '../../lib/usePhotoSrc';

/*
 * A recipe's photograph, at a fixed footprint.
 *
 * Soft corners, no frame, no scrim over the food. A missing, empty or broken
 * image never leaves an empty box: it becomes a drop cap — the recipe's
 * initial set large in italic Fraunces on a paper-sunk ground, like a chapter
 * opening in a printed book — at exactly the same size, so a grid never
 * shifts. The name itself is printed once, under the plate, not twice.
 */

export type PlateSize = 'row' | 'tile' | 'hero';

const SIZE: Record<PlateSize, string> = {
  /** Beside a title in a list. */
  row: 'h-16 w-16 sm:h-20 sm:w-20',
  /** On a shelf tile. */
  tile: 'h-32 w-full',
  /** A recipe's own photograph, and a grid tile. */
  hero: 'aspect-[4/3] w-full',
};

export interface RecipePlateProps {
  /** A web address or a `photo:<id>` reference to a photograph stored on the device. */
  src?: string;
  /** The recipe's title — the plate is named by what it shows. */
  alt: string;
  size?: PlateSize;
  /** The photograph a page opens on: fetched at once rather than when scrolled to. */
  eager?: boolean;
  /** The `view-transition-name` a cookbook tile's photograph grows into (lib/sharedPhoto). */
  transitionName?: string;
  className?: string;
}

export function RecipePlate({ src: ref, alt, size = 'row', eager = false, transitionName, className }: RecipePlateProps) {
  const src = usePhotoSrc(ref);
  const [failed, setFailed] = useState(false);
  // A new photograph deserves a fresh attempt, or one dead link would leave
  // every later plate in this slot without its picture.
  useEffect(() => setFailed(false), [src]);
  const usable = Boolean(src) && !failed;

  return (
    <div
      data-plate=""
      data-photo={transitionName}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
      className={cn('shrink-0 overflow-hidden rounded-key bg-paper-sunk', SIZE[size], className)}
    >
      {usable ? (
        <img
          src={src}
          alt={alt}
          // Two hundred photographs is two hundred requests a list does not
          // need up front; the browser's lazy loading keeps the first paint to
          // what is actually on screen.
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" role="presentation">
          <span
            className={cn('font-title italic leading-none text-pencil', size === 'row' ? 'text-3xl' : 'text-7xl')}
            aria-hidden="true"
          >
            {alt.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
