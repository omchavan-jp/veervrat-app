'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { makeQueryClient } from './query-client';
import { BfcacheGuard } from '@/components/shared/bfcache-guard';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <BfcacheGuard />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
