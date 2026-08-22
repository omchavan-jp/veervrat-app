'use client';

import { Toast as ToastPrimitive } from '@base-ui/react/toast';

import { cn } from '@/lib/utils';

// Thin wrapper over base-ui's toast manager. App shell renders <ToastProvider>
// with <Toaster/> inside; call sites use useToast().add({ title, description, type }).
const ToastProvider = ToastPrimitive.Provider;

/** Imperative toast API. `type` drives the accent edge color. */
function useToast() {
  return ToastPrimitive.useToastManager();
}

function Toaster() {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      data-slot="toast"
      className={cn(
        'rounded-lg border bg-surface p-3 text-sm shadow-toast transition-all',
        'data-[type=error]:border-danger/40 data-[type=success]:border-success/40',
        'data-[starting-style]:translate-x-4 data-[starting-style]:opacity-0',
        'data-[ending-style]:translate-x-4 data-[ending-style]:opacity-0',
      )}
    >
      <ToastPrimitive.Title
        data-slot="toast-title"
        className="font-medium data-[type=error]:text-danger data-[type=success]:text-success"
      />
      <ToastPrimitive.Description
        data-slot="toast-description"
        className="mt-0.5 text-[13px] text-muted"
      />
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted outline-none hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-hidden="true">×</span>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ));
}

export { ToastProvider, Toaster, useToast };
