'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

// Minimal guest-friendly chrome: a top bar with the wordmark and a contextual CTA
// (Dashboard if signed in, otherwise Log in). Deliberately light — the full app shell
// is for authenticated members; content pages stay readable for guests.
export function ContentLayoutClient({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common.nav');
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[60px] items-center justify-between border-b border-border px-5 md:px-10">
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fg font-deva text-sm text-bg">
            वी
          </span>
          <span className="font-display text-[17px]">
            <span className="text-accent">Veer</span>vrat
          </span>
        </Link>
        <Link href={isAuthenticated ? '/dashboard' : '/login'}>
          <Button size="sm" variant="outline">
            {isAuthenticated ? t('dashboard') : t('logIn')}
          </Button>
        </Link>
      </header>
      <main className="mx-auto max-w-[760px] px-5 py-8 md:px-8 md:py-12">{children}</main>
    </div>
  );
}
