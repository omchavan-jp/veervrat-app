'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Catches an error in the root layout itself — rare (RuntimeConfigProvider throwing, a broken
 * font import), but the one place `error.tsx` cannot reach, since that boundary lives INSIDE the
 * layout this file replaces.
 *
 * Next.js requires this file to render its own <html>/<body>: the root layout that would
 * normally provide them is the thing that just failed. Deliberately minimal rather than matching
 * the app's usual chrome — that chrome, including fonts and providers, is exactly what may have
 * caused the error reaching this boundary.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div>
          <p style={{ marginBottom: '0.5rem', fontSize: '18px' }}>Something went wrong.</p>
          <p style={{ color: '#888' }}>The problem has been reported. Please reload the page.</p>
        </div>
      </body>
    </html>
  );
}
