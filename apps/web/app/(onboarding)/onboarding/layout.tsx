'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PreAppControls } from '@/components/shared/pre-app-controls';

export default function OnboardingSubLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

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
