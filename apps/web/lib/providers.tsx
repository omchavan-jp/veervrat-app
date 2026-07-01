'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { makeQueryClient } from './query-client';
import { BfcacheGuard } from '@/components/shared/bfcache-guard';
import { ToastProvider, Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

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
