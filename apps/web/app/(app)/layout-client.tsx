'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
    if (!isLoading && isAuthenticated && user && user.onboardingCompletedAt === null) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, user, router]);

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

  if (user.onboardingCompletedAt === null) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="fixed inset-x-0 top-0 z-20">
        <Header user={user} />
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8 pt-[calc(56px+2rem)]">{children}</main>
    </div>
  );
}
