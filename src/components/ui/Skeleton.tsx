import { cn } from '../../lib/cn';

/*
 * The shape of content that is on its way — never the word "Loading".
 *
 * A soft paper block where the content will be. It is for the network only: a
 * read from the device is fast enough that flashing a skeleton for it would
 * make the local cookbook feel slower than it is.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-key bg-paper-tonal', className)}
      {...props}
    />
  );
}
