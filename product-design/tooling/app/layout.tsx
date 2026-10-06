import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';

export const metadata = {
  title: 'Veervrat Product Design',
  description: 'Human-readable redesign workspace',
};

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: 'static', api: '/product-docs/api/search' } }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
