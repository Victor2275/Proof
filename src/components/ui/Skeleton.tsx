import { cn } from '../../lib/cn';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-black/10 dark:bg-white/10", className)}
      {...props}
    />
  );
}

// Pre-configured skeleton blocks
export function SkeletonCard() {
  return (
    <div className="flex flex-col h-full bg-sidebar/50 border border-border-subtle rounded-2xl overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="mt-auto pt-4 border-t border-border-subtle">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
