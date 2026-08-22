'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCreateTest } from '@/hooks/use-tests';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function TestEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('study.test');
  const createTest = useCreateTest();

  const start = () => {
    createTest.mutate(id, {
      onSuccess: (test) => {
        router.replace(`/study/${id}/test/${test.id}`);
      },
    });
  };

  useEffect(() => {
    start();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (createTest.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertTitle>{t('createError')}</AlertTitle>
          <div className="mt-3">
            <Button size="sm" variant="outline" loading={createTest.isPending} onClick={start}>
              {t('retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" label={t('creating')} />
    </div>
  );
}
