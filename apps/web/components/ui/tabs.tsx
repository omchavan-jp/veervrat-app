'use client';

import { cn } from '@/lib/utils';

export type TabItem = {
  key: string;
  label: string;
  count?: number;
};

// In-content sub-navigation (e.g. journey interior). Active = accent text + underline.
// Sticky + horizontally scrollable on narrow screens. Controlled.
export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative whitespace-nowrap px-4 py-3.5 text-[14px] transition-colors',
              isActive ? 'font-medium text-accent' : 'text-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px font-mono text-[10px] font-semibold text-bg">
                {item.count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-t bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
