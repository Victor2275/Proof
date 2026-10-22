import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * Back, named for where it goes: "‹ Dessert".
 *
 * It is a real link to the parent, so it can be opened in a new tab, read by a
 * screen reader as navigation, and still works with JavaScript off. A tap
 * goes back through history when there is history inside the app — so the
 * screen you return to keeps its scroll — and follows the link to the parent
 * when there is not: a shared link opened cold (`/r/:slug`) must never take
 * someone out of the app. Android's hardware back runs the same history.
 */
export interface BackButtonProps {
  /** The parent screen: where back leads when there is no in-app history. */
  to: string;
  /** The parent's name, shown beside the chevron. */
  label: string;
  className?: string;
}

export function BackButton({ to, label, className }: BackButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // React Router keys the first entry of a session 'default': nothing in the
  // app came before it, so going back would leave the app.
  const hasHistory = location.key !== 'default';

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hasHistory || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(-1);
  };

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={`Back to ${label}`}
      className={cn(
        'pressable -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pl-1.5 pr-3.5',
        'font-sans text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk active:bg-paper-tonal',
        className,
      )}
    >
      <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
