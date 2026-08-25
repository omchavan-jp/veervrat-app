import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import { ToastProvider } from '@/components/ui/toast';

// Shared test render: wraps the UI in the providers every app component expects —
// next-intl (so useTranslations works), TanStack Query (so data hooks mount), and the toast
// provider (so a component that reports an error can actually report it).
//
// ToastProvider was added 2026-08-25. It was not needed before because `useToast` was a stub
// that called `console.log` and returned — which is precisely why 51 call sites displayed
// nothing in the real app. Now that the hook reaches the real provider, a component that toasts
// needs one here too, exactly as it does in `providers.tsx`. Tests that pass without it are
// tests of a component that cannot speak.
export function renderWithProviders(ui: ReactElement, locale: 'en' | 'mr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={enMessages}>
        <QueryClientProvider client={client}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
