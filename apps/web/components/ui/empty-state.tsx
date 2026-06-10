import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Calm, encouraging empty state — never a dead end. Icon-in-tinted-circle + heading
// + muted explanation + optional CTA/action.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-border-strong px-8 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          {icon}
        </div>
      )}
      <h4 className="font-display text-[18px] font-medium">{title}</h4>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
