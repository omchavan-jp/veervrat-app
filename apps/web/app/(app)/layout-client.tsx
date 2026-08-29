'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/api/query-keys';
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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPath = useRef(pathname);

  // Re-check who this is when the route changes.
  //
  // Without this a signed-out session went on rendering guarded pages for up to a minute. The
  // guard below reads `isAuthenticated` from the auth query, that query has a 60s `staleTime`,
  // and client-side navigation inside this group never remounts this component — so nothing
  // revalidated. Pages that fetched data hit a 401 and redirected, which made it look correct;
  // pages served from cache did not. Confirmed on UAT 2026-08-29: after signing out in another
  // tab, `/study` kept rendering while `/journeys` redirected.
  //
  // On navigation rather than on render, and deliberately. The 60s `staleTime` is load-bearing —
  // `use-auth.ts` records the request storm it exists to prevent (~200 calls a second, #101), and
  // bounding `refetchOnWindowFocus` is what makes that safe. A route change is a bounded event:
  // one check per navigation, ~7-10ms, against a page the person is about to be shown anyway.
  //
  // Skipped on first render — the server already resolved the session to seed this page, so
  // asking again immediately would repeat work just done.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [pathname, queryClient]);

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
