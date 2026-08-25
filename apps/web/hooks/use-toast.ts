'use client';

import { useCallback } from 'react';
import { useToast as useToastManager } from '@/components/ui/toast';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

/**
 * Imperative toast, in the `toast({ title, variant })` shape 21 components already call.
 *
 * This used to be a placeholder that called `console.log` and returned — its own comment said
 * "In a real app, this would dispatch to a toast provider". Meanwhile the real toast system
 * existed and `<Toaster/>` was mounted in `providers.tsx`, so **51 call sites across those 21
 * files displayed nothing at all**: every "Couldn't save", every "Published", every moderation
 * failure. Found on 2026-08-25 from an upload that returned 500 while the UI stayed silent.
 *
 * That silence is why `openspec/changes/ui-ux-remediation` RC04 — "ensure every mutation has
 * user-visible error feedback" — was recorded complete while being inert. The calls were all
 * written correctly; they were wired to a stub.
 *
 * Kept as an adapter rather than rewriting those 51 call sites: the `variant` vocabulary is
 * already consistent across them, and translating it here is one place to be right instead of
 * twenty-one places to change. `@/components/ui/toast` remains the underlying system; new code
 * may use either, and this one costs nothing extra.
 */
export function useToast() {
  const manager = useToastManager();

  const toast = useCallback(
    ({ title, description, variant }: ToastOptions) => {
      manager.add({
        title,
        description,
        // `type` drives the accent colour in `toast.tsx` (`data-[type=error]`, `data-[type=success]`).
        // 'default' deliberately carries no type: a neutral acknowledgement should not be dressed
        // as a success, which is the distinction #125 exists to design properly.
        type: variant === 'destructive' ? 'error' : variant === 'warning' ? 'warning' : undefined,
      });
    },
    [manager],
  );

  return { toast };
}
