'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { experienceLogsApi } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { ExperienceEditor } from '@/components/experience/experience-editor';

export default function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: () => experienceLogsApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }
  if (isError || !data) {
    return <div className="mx-auto max-w-[720px] text-muted">Not found.</div>;
  }
  return <ExperienceEditor existing={data} journeyId={data.journeyId ?? undefined} />;
}
