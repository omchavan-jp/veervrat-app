'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Sparkles, RotateCcw } from 'lucide-react';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

// Zone D — a fast-to-scan list of journeys to start (IA.md). Tight hairline rows, not
// raised banner cards (15a §4: the hero is the only raised surface). Capped at 3 with a
// "see all" so the page doesn't stack every suggestion full-width.
const VISIBLE_LIMIT = 3;

export function DashboardSuggestions() {
  const t = useTranslations('dashboard');
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.suggestions,
    queryFn: dashboardApi.getSuggestions,
  });

  if (isPending) {
    return (
      <section>
        <SectionHeading className="mb-4">{t('suggestionsTitle')}</SectionHeading>
        <div className="space-y-px">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-border/60" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        <SectionHeading className="mb-4">{t('suggestionsTitle')}</SectionHeading>
        <EmptyState
          icon={<RotateCcw className="h-5 w-5" />}
          title={t('suggestionsError')}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          }
        />
      </section>
    );
  }

  const suggestions = data?.suggestions ?? [];
  const visible = suggestions.slice(0, VISIBLE_LIMIT);
  const hasMore = suggestions.length > VISIBLE_LIMIT;

  return (
    <section>
      <SectionHeading className="mb-4">{t('suggestionsTitle')}</SectionHeading>
      {suggestions.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title={t('suggestionsEmpty')}
          action={
            <Link
              href="/study"
              className={cn(buttonVariants({ variant: 'default' }), 'h-auto px-6 py-3 text-[14px]')}
            >
              {t('suggestionsEmptyCta')}
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {visible.map((s) => (
            <div
              key={s.sentenceId}
              className="flex items-center justify-between gap-4 py-3 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <BilingualText en={s.sentenceTextEn} mr={s.sentenceTextMr} size="sm" />
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                  <ContentText
                    en={s.subvirtueNameEn}
                    mr={s.subvirtueNameMr}
                    className="text-accent"
                  />
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <ContentText en={s.weaknessNameEn} mr={s.weaknessNameMr} />
                </div>
              </div>
              <Link
                href={`/study?sentenceId=${s.sentenceId}`}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'shrink-0 gap-1 text-accent hover:bg-accent/10',
                )}
              >
                {t('suggestionsStartJourney')}
              </Link>
            </div>
          ))}
          {hasMore && (
            <div className="pt-3">
              <Link
                href="/study"
                className="text-[13px] text-muted underline decoration-border-strong underline-offset-2 hover:text-fg"
              >
                {t('suggestionsSeeAll', { count: suggestions.length })}
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
