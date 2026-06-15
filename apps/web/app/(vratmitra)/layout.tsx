import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppLayoutClient } from '../(app)/layout-client';

// VM pages share the same app shell as the VA pages (rail, auth gate, providers) —
// they are not a shell-less route group. See actions-guidance design decision #3.
export default async function VratmitraLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppLayoutClient>{children}</AppLayoutClient>
    </NextIntlClientProvider>
  );
}
