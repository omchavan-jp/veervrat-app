'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BookText } from 'lucide-react';
import { experienceLogsApi } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { ExperienceEditor } from '@/components/experience/experience-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export default function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('experiences');
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: () => experienceLogsApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[720px]">
        <EmptyState
          icon={<BookText className="h-5 w-5" />}
          title={t('notFound')}
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/experiences" />}
            >
              {t('back')}
            </Button>
          }
        />
      </div>
    );
  }
  return <ExperienceEditor existing={data} journeyId={data.journeyId ?? undefined} />;
}
