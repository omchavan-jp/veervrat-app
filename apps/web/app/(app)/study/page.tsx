'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search } from 'lucide-react';
import { useWeaknesses } from '@/hooks/use-weaknesses';
import { WhyModal } from '@/components/study/why-modal';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { EmptyState } from '@/components/ui/empty-state';
import { BilingualText } from '@/components/shared/bilingual-text';
import { PageTitle, SectionLabel } from '@/components/ui/typography';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function StudyBrowserPage() {
  const t = useTranslations('study.browser');
  const tStudy = useTranslations('study');
  const { data, isLoading, isError, refetch } = useWeaknesses();
  const clusters = data?.clusters ?? [];

  return (
    <div className="py-8">
      <SectionLabel className="mb-1 text-accent">{tStudy('nav')}</SectionLabel>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <PageTitle className="mb-1">{t('title')}</PageTitle>
          <p className="text-[14px] text-muted">{t('subtitle')}</p>
        </div>
        <WhyModal />
      </div>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={clusters.length === 0}
        onRetry={() => refetch()}
        errorTitle={t('loadError')}
        retryLabel={t('retry')}
        skeleton={
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
        empty={
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={t('emptyTitle')}
            description={t('emptyBody')}
          />
        }
      >
        <div className="space-y-10">
          {clusters.map((cluster) => (
            <section key={cluster.key}>
              <SectionLabel as="h2" className="mb-4">
                {cluster.label}
              </SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {cluster.weaknesses.map((w, i) => (
                  <Link
                    key={w.id}
                    href={`/study/${w.id}`}
                    className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-bg"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-muted group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </div>
                    <BilingualText en={w.nameEn} mr={w.nameMr} size="md" as="h3" className="mb-2" />
                    {w.description && (
                      <p className="mb-3 line-clamp-2 text-[13px] text-muted">{w.description}</p>
                    )}
                    {w.stats && (
                      <div className="flex items-center gap-4 border-t border-border pt-3">
                        <span
                          className={`text-[12px] ${w.stats.testsTaken > 0 ? 'text-accent-2' : 'text-muted'}`}
                        >
                          {w.stats.testsTaken > 0
                            ? t('testsTaken', { count: w.stats.testsTaken })
                            : t('notExplored')}
                        </span>
                        {w.stats.hasActiveJourney && (
                          <span className="text-[12px] text-accent">{t('journeyActive')}</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </QueryBoundary>
    </div>
  );
}
