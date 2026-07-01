'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { Spinner } from '@/components/ui/spinner';

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const tCommon = useTranslations('common');
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Guard with else-if so onboarding and login redirects can never both fire in a
    // single effect run (avoids a double-navigation race on mid-update state).
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user && user.onboardingCompletedAt === null) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner size="lg" label={tCommon('loading')} />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.onboardingCompletedAt === null) {
    return null;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
