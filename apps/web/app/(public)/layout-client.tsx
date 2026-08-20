'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function PublicLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirects handle CHANGES only — signing in, or arriving here with a live session. The
    // initial state is seeded server-side, so there is nothing to wait for on first render.
    if (isAuthenticated && user) {
      router.replace(user.onboardingCompletedAt ? '/dashboard' : '/onboarding');
    }
  }, [isAuthenticated, user, router]);

  // No isLoading branch. It used to unmount every child while the auth query was in flight,
  // and remounting them re-triggered that query — the feedback loop behind the /auth/me
  // request storm (#101). Auth now arrives with the HTML, so the branch has nothing to gate.
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
