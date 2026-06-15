import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ContentLayoutClient } from './layout-client';

// Guest-accessible content shell. Unlike (app) it does not gate on auth, and unlike
// (public) it does not redirect authenticated users away — content pages here are
// browseable by guests and members alike (spec/09 guest access). The first such page
// is the public experience pool; the virtues/pothi/shlokas browsers (items 26/29)
// will join this group.
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ContentLayoutClient>{children}</ContentLayoutClient>
    </NextIntlClientProvider>
  );
}
