'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

// Single tokenized switch replacing the two divergent bespoke toggles (settings
// h-6 w-10 bg-muted/30 vs profile h-6 w-11 bg-border-strong). On = accent.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-border-strong transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none ml-0.5 block size-5 rounded-full bg-surface shadow-card ring-0 transition-transform data-[checked]:translate-x-5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
