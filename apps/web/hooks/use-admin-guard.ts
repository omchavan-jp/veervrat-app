'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

// Client-side admin gate for the (admin) route group. The server endpoints are the
// real security boundary; this only redirects non-admins away from the UI.
export function useAdminGuard(): { isAdmin: boolean; ready: boolean } {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = (user?.roles ?? []).some((r) => r === 'ADMIN');

  useEffect(() => {
    if (!isLoading && user && !isAdmin) router.replace('/dashboard');
  }, [isLoading, user, isAdmin, router]);

  return { isAdmin, ready: !isLoading };
}
