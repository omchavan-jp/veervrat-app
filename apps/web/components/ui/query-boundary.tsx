'use client';

import type { ReactNode } from 'react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Forces the three async states to be handled distinctly so an error can never
// collapse into the empty state (RC03) or hang on an infinite spinner. Pass the
// flags straight from a TanStack useQuery result.
interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  // Optional shape-matching skeleton shown while loading instead of the centered
  // spinner — preferred on list/data screens (the layout no longer pops in).
  skeleton?: ReactNode;
  errorTitle: string;
  errorDescription?: string;
  retryLabel?: string;
  empty?: ReactNode;
  children: ReactNode;
  className?: string;
}

function QueryBoundary({
  isLoading,
  isError,
  isEmpty = false,
  onRetry,
  loadingLabel,
  skeleton,
  errorTitle,
  errorDescription,
  retryLabel = 'Retry',
  empty,
  children,
  className,
}: QueryBoundaryProps) {
  if (isLoading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className={className ?? 'flex justify-center py-12'}>
        <Spinner label={loadingLabel} />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>{errorTitle}</AlertTitle>
        {errorDescription && <AlertDescription>{errorDescription}</AlertDescription>}
        {onRetry && (
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        )}
      </Alert>
    );
  }

  if (isEmpty && empty) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}

export { QueryBoundary };
