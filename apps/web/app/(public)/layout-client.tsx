'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function PublicLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // A `token` in the address means this person is completing an action that was emailed to
  // them — setting a first password, verifying an address, confirming an email change. Those
  // are things a SIGNED-IN person legitimately does, and bouncing them to the dashboard makes
  // the link appear broken: the only way through was to open it in a private window (#196,
  // reported 2026-08-26).
  //
  // The redirect still applies to login and signup, where a signed-in visitor has no business.
  const completingEmailedAction = Boolean(searchParams.get('token'));

  useEffect(() => {
    // Redirects handle CHANGES only — signing in, or arriving here with a live session. The
    // initial state is seeded server-side, so there is nothing to wait for on first render.
    if (isAuthenticated && user && !completingEmailedAction) {
      router.replace(user.onboardingCompletedAt ? '/dashboard' : '/onboarding');
    }
  }, [isAuthenticated, user, router, completingEmailedAction]);

  // No isLoading branch. It used to unmount every child while the auth query was in flight,
  // and remounting them re-triggered that query — the feedback loop behind the /auth/me
  // request storm (#101). Auth now arrives with the HTML, so the branch has nothing to gate.
  if (isAuthenticated && !completingEmailedAction) {
    return null;
  }

  return <>{children}</>;
}
