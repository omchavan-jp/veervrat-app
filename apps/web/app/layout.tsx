import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { geistSans, geistMono, newsreader, tiroDevanagari } from './fonts';
import { Providers } from '@/lib/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veervrat',
  description: 'A platform for self-reliance and personal growth',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const locale = headerStore.get('X-Next-Locale') ?? 'en';

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${tiroDevanagari.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
