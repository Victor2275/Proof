import { cn } from '../../lib/cn';

/*
 * A ribbon bookmark hanging from the top edge of a card: the place you left
 * the book open. There is one, on the cookbook's "pick up where you left off"
 * card, and it is decoration with a meaning — so it is hidden from assistive
 * technology, whose readers get the card's own words instead.
 */
export function Ribbon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('absolute right-[1.125rem] top-0 h-10 w-4 bg-accent', className)}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)' }}
    />
  );
}
