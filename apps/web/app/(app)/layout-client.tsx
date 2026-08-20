'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { FeedbackWidget } from '@/components/shared/feedback/feedback-widget';
import dynamic from 'next/dynamic';

// Dev-only in-context content editor: dynamically imported, and only when the build flag is
// on, so it is completely excluded from the production bundle.
const ContentEditor =
  process.env.NEXT_PUBLIC_CONTENT_EDIT === 'on'
    ? dynamic(() =>
        import('@/components/shared/content-editor/content-editor').then((m) => m.ContentEditor),
      )
    : () => null;

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Guard with else-if so onboarding and login redirects can never both fire in a
    // single effect run (avoids a double-navigation race on mid-update state).
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user && user.onboardingCompletedAt === null) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, user, router]);

  // No isLoading branch — auth is seeded server-side, so the first render already knows. The
  // branch previously unmounted the whole subtree while the query ran, which is what let a
  // remount re-trigger the query and storm the api (#101).

  if (!isAuthenticated || !user || user.onboardingCompletedAt === null) {
    return null;
  }

  // All four authenticated route groups ((app), (vratmitra), (moderation), (admin))
  // share this shell, so the feedback widget mounts once here — never on public pages.
  return (
    <AppShell user={user}>
      {children}
      <FeedbackWidget />
      {user.isContentEditor && <ContentEditor />}
    </AppShell>
  );
}
