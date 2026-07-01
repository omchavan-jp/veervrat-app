'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Guest-browseable content shell (virtues/pothi/shlokas/resources/community — spec/09
// guest access). Authenticated members get the full app chrome (left rail + pill nav)
// so the sidebar never vanishes when they navigate into a content page from the app.
// Actual guests get the minimal top bar with a wordmark and a Log in CTA.
export function ContentLayoutClient({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common.nav');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated, isLoading } = useAuth();

  // Avoid a flash of the guest bar before the session resolves: hold on a spinner.
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner size="lg" label={tCommon('loading')} />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <AppShell user={user}>{children}</AppShell>;
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-16 items-center justify-between border-b border-border px-5 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-fg font-deva text-sm text-bg">
            वी
          </span>
          <span className="font-display text-[17px]">
            <span className="text-accent">Veer</span>vrat
          </span>
        </Link>
        <Link href="/login">
          <Button size="sm" variant="outline">
            {t('logIn')}
          </Button>
        </Link>
      </header>
      <main className="mx-auto max-w-[760px] px-5 py-8 md:px-8 md:py-12">{children}</main>
    </div>
  );
}
