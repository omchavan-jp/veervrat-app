'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

// Responsive dialog: centered modal on desktop (spring scale-in), bottom sheet on mobile.
// Controlled via open/onOpenChange. Composable content via children.
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-fg/30 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            'fixed z-50 flex flex-col bg-surface shadow-modal outline-none transition-all duration-200',
            // mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[22px] p-6 pb-8 data-[ending-style]:translate-y-3 data-[starting-style]:translate-y-3 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            // desktop: centered modal
            'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(420px,calc(100vw-40px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[22px] md:p-7 md:pb-7 md:data-[ending-style]:translate-y-0 md:data-[starting-style]:translate-y-0 md:data-[ending-style]:scale-[0.96] md:data-[starting-style]:scale-[0.96]',
            className,
          )}
        >
          {/* mobile grab handle */}
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong md:hidden" />
          {title && (
            <DialogPrimitive.Title className="font-display text-[21px] font-medium">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="mt-2 text-[14px] text-muted">
              {description}
            </DialogPrimitive.Description>
          )}
          {children && <div className="mt-4 overflow-y-auto">{children}</div>}
          {footer && <div className="mt-6 flex justify-end gap-2.5">{footer}</div>}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { DialogPrimitive };
