import { cn } from '../../lib/cn';

/*
 * The personal-best stamp: a small round mark set at an angle in the corner of
 * a bake, the way a cook would rubber-stamp the good one. Only the best bake of
 * a recipe gets one — a stamp on every bake would stamp nothing.
 *
 * `fresh` is the moment it is first earned: one 160 ms press onto the page.
 * Under reduced motion the global rule collapses it to nothing.
 */
export interface StampProps {
  /** The bake's stars, printed under the word when it has some. */
  rating?: number | null;
  fresh?: boolean;
  className?: string;
}

export function Stamp({ rating, fresh = false, className }: StampProps) {
  return (
    <span
      role="img"
      aria-label="Personal best"
      className={cn(
        'flex h-[50px] w-[50px] -rotate-8 flex-col items-center justify-center rounded-full border-[1.5px] border-accent bg-paper/90 font-sans leading-none text-accent',
        fresh && 'stamp-thump',
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.625rem] font-semibold">
        Best
      </span>
      {rating ? (
        <span aria-hidden="true" className="mt-0.5 text-[0.6875rem] tabular-nums">
          ★{rating}
        </span>
      ) : null}
    </span>
  );
}
