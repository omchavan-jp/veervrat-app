'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { makeQueryClient } from './query-client';
import { queryKeys } from './api/query-keys';
import type { SessionUser } from './session-user';
import { BfcacheGuard } from '@/components/shared/bfcache-guard';
import { ToastProvider, Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  // Seeded ONCE, in the initialiser. Deliberately not an effect and not re-applied on later
  // renders: re-seeding would resurrect a signed-out user after logout, which is the one
  // genuinely dangerous failure mode of seeding (see the change's design.md, Q2).
  const [queryClient] = useState(() => {
    const client = makeQueryClient();
    client.setQueryData(queryKeys.auth.me, initialUser ?? null);
    return client;
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BfcacheGuard />
            {children}
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
