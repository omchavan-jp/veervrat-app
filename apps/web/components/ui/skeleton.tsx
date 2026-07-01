import { cn } from '@/lib/utils';

// Low-key shimmer placeholder for loading states. Use a skeleton that mirrors the
// real content's shape on list/data screens instead of a centered spinner — the
// layout no longer "pops in", which is the single biggest perceived-quality lift on
// first load. Honors prefers-reduced-motion via motion-reduce (globals.css also caps
// animation duration globally). Decorative: aria-hidden, with the live region owned by
// the surrounding boundary's label.
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-border/60 motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

// A reusable skeleton matching the standard bordered list-card shape (title line +
// subtitle + a couple of meta chips). Count controls how many rows render.
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border p-5', className)}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
