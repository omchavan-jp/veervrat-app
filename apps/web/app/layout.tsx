import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { geistSans, geistMono, newsreader, tiroDevanagari } from './fonts';
import { Providers } from '@/lib/providers';
import { RuntimeConfigProvider } from '@/lib/runtime-config-provider';
import { readServerRuntimeConfig } from '@/lib/runtime-config';
import './globals.css';

const description = 'A platform for self-reliance and personal growth — Jnana Prabodhini.';

// generateMetadata, not a module-level `metadata` object: the site URL is per-environment and
// must be read at request time. As a build-time constant it shipped UAT's hostname to prod,
// making every link preview point at the wrong environment.
export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = readServerRuntimeConfig();

  return {
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const locale = headerStore.get('X-Next-Locale') ?? 'en';
  const runtimeConfig = readServerRuntimeConfig();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${tiroDevanagari.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <RuntimeConfigProvider config={runtimeConfig}>
          <Providers>{children}</Providers>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
