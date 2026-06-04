'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCreateJourney } from '@/hooks/use-journeys';
import { ApiError } from '@/lib/api/client';

export default function NewJourneyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentenceId = searchParams.get('sentenceId');
  const weaknessId = searchParams.get('weaknessId');
  const createJourney = useCreateJourney();

  useEffect(() => {
    if (!sentenceId || !weaknessId) {
      router.replace('/study');
      return;
    }

    createJourney.mutate(
      { sentenceId, weaknessId },
      {
        onSuccess: (journey) => {
          router.replace(`/journeys/${journey.id}`);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.statusCode === 409) {
            // Conflict — existing journey; redirect to it
            const existingId = (err.details as { existingJourneyId?: string })?.existingJourneyId;
            if (existingId) {
              router.replace(`/journeys/${existingId}`);
              return;
            }
          }
          router.replace('/study');
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
}
