'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useWeakness } from '@/hooks/use-weaknesses';
import { WhyModal } from '@/components/study/why-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';

export default function WeaknessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('study.detail');
  const format = useFormatter();
  const { data: weakness, isLoading, isError, refetch } = useWeakness(id);

  const backLink = (
    <Link
      href="/study"
      className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t('backToWeaknesses')}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8">
        {backLink}
        <Alert variant="destructive" className="max-w-sm">
          <AlertTitle>{t('loadError')}</AlertTitle>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!weakness) {
    return (
      <div className="py-8">
        {backLink}
        <p className="text-muted">{t('notFound')}</p>
      </div>
    );
  }

  const hasDraft = !!weakness.draftTestId;

  return (
    <div className="py-8">
      {backLink}

      <div className="mb-8">
        <BilingualText
          en={weakness.nameEn}
          mr={weakness.nameMr}
          size="xl"
          as="h1"
          className="mb-3"
        />
        {weakness.description && (
          <p className="text-[15px] leading-relaxed text-muted">{weakness.description}</p>
        )}
        <div className="mt-4">
          <WhyModal />
        </div>
      </div>

      {/* Subvirtues */}
      {weakness.subvirtues.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {t('subvirtuesTitle')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {weakness.subvirtues.map((sv) => (
              <span
                key={sv.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-2/30 px-3 py-1 text-[13px] text-accent-2"
              >
                <ContentText en={sv.virtue.nameEn} mr={sv.virtue.nameMr} />
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <ContentText en={sv.nameEn} mr={sv.nameMr} />
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Test history */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {t('testHistoryTitle')}
        </h2>
        {weakness.testHistory.length === 0 ? (
          <p className="text-[14px] text-muted">{t('noTests')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakness.testHistory.map((test, i) => (
              <Link
                key={test.id}
                href={`/study/${id}/test/${test.id}/report`}
                className="rounded-full border border-border px-3 py-1 text-[13px] text-muted hover:border-accent hover:text-fg"
              >
                {t('testPill', {
                  n: i + 1,
                  date: format.dateTime(new Date(test.submittedAt), { dateStyle: 'medium' }),
                })}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <Button
        size="lg"
        className="h-auto rounded-xl px-8 py-3.5 text-[15px]"
        nativeButton={false}
        render={
          <Link
            href={hasDraft ? `/study/${id}/test/${weakness.draftTestId}` : `/study/${id}/test`}
          />
        }
      >
        {hasDraft ? t('resumeDraft') : t('takeTest')}
      </Button>
    </div>
  );
}
