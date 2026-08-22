'use client';

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Selectable group where the chosen item carries aria-pressed (not color-only).
// Used for score selection and check-in status selectors.
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    />
  );
}

const toggleItemVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-transparent text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted/40 data-[pressed]:border-accent data-[pressed]:bg-accent/10 data-[pressed]:text-accent',
  {
    variants: {
      size: {
        // min-h-11 keeps the most-used test interaction tappable on mobile (>=44px).
        default: 'min-h-11 px-4 py-2',
        sm: 'min-h-9 px-3 py-1.5 text-[0.8rem]',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

function ToggleGroupItem({
  className,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleItemVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(toggleItemVariants({ size }), className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem, toggleItemVariants };
