'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PreAppControls } from '@/components/shared/pre-app-controls';

export default function OnboardingSubLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handles a session ending while onboarding is open. The initial state is seeded, so there
    // is no in-flight window to guard.
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      {/* Onboarding previously rendered with no header at all — no logout, no language, no way
          out but closing the tab. That is poor on a shared or family device, and traps anyone
          who picked the wrong language at signup, since the Settings toggle is past this flow. */}
      <header className="flex justify-end px-6 py-5 lg:px-10">
        <PreAppControls showLogout />
      </header>
      {children}
    </>
  );
}
