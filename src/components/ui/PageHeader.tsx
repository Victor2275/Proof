import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * The top of a screen: its name in the title face, and the screen's own
 * controls ranged at the right — "New", "Log bake", the avatar on a phone.
 *
 * No rule under it and no explanatory paragraph: a page is named, not
 * introduced. A short line of facts ("17 bakes · 6 recipes") may sit under the
 * title when the screen has some.
 */
export interface PageHeaderProps {
  title: ReactNode;
  /** A short line under the title: counts, not a description. */
  subtitle?: ReactNode;
  /** Sits above the title: a BackButton on a pushed screen. */
  back?: ReactNode;
  /** Controls at the right of the title. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-1 pt-2 md:pt-6', className)}>
      {back ? <div className="-mb-1">{back}</div> : null}
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="font-title min-w-0 text-[2.125rem] leading-tight text-ink md:text-4xl">{title}</h1>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
      {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
    </header>
  );
}
