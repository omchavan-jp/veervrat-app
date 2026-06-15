'use client';

import { useSearchParams } from 'next/navigation';
import { ExperienceEditor } from '@/components/experience/experience-editor';

export default function NewExperiencePage() {
  const params = useSearchParams();
  const journeyId = params.get('journeyId') ?? undefined;
  return <ExperienceEditor journeyId={journeyId} />;
}
