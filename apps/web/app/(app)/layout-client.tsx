'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useRuntimeConfig } from '@/lib/runtime-config-provider';
import { AppShell } from '@/components/layout/app-shell';
import { ActionLauncher } from '@/components/shared/launcher/action-launcher';
import { ConsentGate } from '@/components/shared/consent-gate';
import dynamic from 'next/dynamic';

// In-context content editor. Lazily imported, and rendered only when the ENVIRONMENT allows it
// AND this person holds the CONTENT_EDIT grant.
//
// ⚠️ This used to be gated on `NEXT_PUBLIC_CONTENT_EDIT`, a BUILD-time flag — which meant it was
// compiled out of every deployed build, because CD never passed it. Granting CONTENT_EDIT to a
// user therefore did nothing anywhere: the capability was enforced server-side, but there was no
// component to render. And it could not be fixed by setting the flag: `NEXT_PUBLIC_*` is baked
// at build time and one image is promoted UAT -> prod, so turning it on for UAT turns it on for
// prod too (conventions §17 — the same category error as O22).
//
// `dynamic()` keeps the original intent: the editor lives in its own chunk, fetched only when it
// actually renders. Nobody on prod renders it, so nobody downloads it.
const ContentEditor = dynamic(() =>
  import('@/components/shared/content-editor/content-editor').then((m) => m.ContentEditor),
);

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { contentEditEnabled } = useRuntimeConfig();
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
      <ActionLauncher />
      {/* Asks again when a policy has been republished. Mounted here so it covers all four
          authenticated route groups and never public pages — nobody should be asked to
          re-consent while signed out. */}
      <ConsentGate enabled={isAuthenticated} />
      {contentEditEnabled && user.grants?.includes('CONTENT_EDIT') && <ContentEditor />}
    </AppShell>
  );
}
