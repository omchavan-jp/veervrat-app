import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { geistSans, geistMono, newsreader, tiroDevanagari } from './fonts';
import { Providers } from '@/lib/providers';
import './globals.css';

// Absolute base for og:image / canonical URLs. Set NEXT_PUBLIC_SITE_URL to the
// public web origin (update it when you move to a custom domain).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-production-1fec3.up.railway.app';
const description = 'A platform for self-reliance and personal growth — Jnana Prabodhini.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Veervrat', template: '%s · Veervrat' },
  description,
  applicationName: 'Veervrat',
  openGraph: {
    type: 'website',
    siteName: 'Veervrat',
    title: 'Veervrat',
    description,
    url: siteUrl,
    // og:image is provided automatically by app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veervrat',
    description,
  },
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
