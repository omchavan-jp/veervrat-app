import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';

// Shared test render: wraps the UI in the providers every app component expects —
// next-intl (so useTranslations works) and TanStack Query (so data hooks mount).
// Components were migrated to next-intl; tests must provide the messages context.
export function renderWithProviders(ui: ReactElement, locale: 'en' | 'mr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={enMessages}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
