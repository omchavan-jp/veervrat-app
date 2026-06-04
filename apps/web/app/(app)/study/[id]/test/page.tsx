'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCreateTest } from '@/hooks/use-tests';

export default function TestEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const createTest = useCreateTest();

  useEffect(() => {
    createTest.mutate(id, {
      onSuccess: (test) => {
        router.replace(`/study/${id}/test/${test.id}`);
      },
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
}
