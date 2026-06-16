import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppLayoutClient } from '../(app)/layout-client';

// Moderation pages render inside the shared app shell (rail, auth gate, providers) —
// not shell-less. Server endpoints enforce moderator-only; the pages additionally guard.
export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppLayoutClient>{children}</AppLayoutClient>
    </NextIntlClientProvider>
  );
}
