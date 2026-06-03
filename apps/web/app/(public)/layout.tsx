import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { PublicLayoutClient } from './layout-client';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <PublicLayoutClient>{children}</PublicLayoutClient>
    </NextIntlClientProvider>
  );
}
