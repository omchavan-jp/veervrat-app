'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Logo } from '@/components/auth/logo';

/**
 * Catches a render error anywhere under the root layout — everything except the root layout
 * itself, which `global-error.tsx` covers separately.
 *
 * Reports to Sentry directly, from `useEffect`, rather than relying on the SDK's automatic
 * capture: Next.js's error boundary mechanism intercepts the exception before it becomes an
 * unhandled one, so nothing captures it unless a boundary explicitly forwards it.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-20 text-center">
      <div className="mb-16">
        <Logo />
      </div>

      <div className="mb-6 max-w-[520px] font-display text-[28px] leading-tight tracking-tight">
        Something went wrong.
      </div>

      <div className="mb-12 max-w-[480px] text-[15px] leading-relaxed text-muted">
        The problem has been reported. Trying again usually works — if it doesn&rsquo;t, come back
        in a few minutes.
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-border-strong bg-transparent px-8 py-3.5 text-[15px] font-medium text-fg hover:bg-fg hover:text-bg"
        >
          Return to your practice
        </Link>
      </div>
    </div>
  );
}
