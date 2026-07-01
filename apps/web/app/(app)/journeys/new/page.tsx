'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCreateJourney } from '@/hooks/use-journeys';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import { Spinner } from '@/components/ui/spinner';

export default function NewJourneyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('journey.new');
  const { toast } = useToast();
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
          // Surface the failure before bouncing back so it isn't silent.
          toast({
            title: t('createError'),
            description: err instanceof Error ? err.message : undefined,
            variant: 'destructive',
          });
          router.replace('/study');
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" label={t('creating')} />
    </div>
  );
}
