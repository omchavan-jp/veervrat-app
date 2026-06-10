'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// When a page is restored from the browser's back-forward cache (bfcache), the React
// tree and any in-flight requests (e.g. the auth /me query) can be frozen in a stale
// state — which showed up as an indefinite loading spinner after pressing Back from a
// 404. On a bfcache restore we refresh so server components + queries re-sync.
export function BfcacheGuard() {
  const router = useRouter();
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);
  return null;
}
