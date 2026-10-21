import { cn } from '../../lib/cn';

/*
 * The shape of content that is on its way — never the word "Loading".
 *
 * Drawn as an unlit key: the same surface an unreached phase uses, so a
 * skeleton reads as slots waiting to be filled rather than as a grey fog. It
 * is for the network only (decision B30). A read from the device is fast
 * enough that flashing a skeleton for it would make the local cookbook feel
 * slower than the server-backed one it replaced.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-key bg-key-unlit', className)}
      {...props}
    />
  );
}
