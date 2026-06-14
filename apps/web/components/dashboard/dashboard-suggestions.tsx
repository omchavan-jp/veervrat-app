'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';
import { BilingualText } from '@/components/shared/bilingual-text';

export function DashboardSuggestions() {
  const t = useTranslations('dashboard');
  const { data, isPending } = useQuery({
    queryKey: queryKeys.dashboard.suggestions,
    queryFn: dashboardApi.getSuggestions,
  });

  if (isPending) {
    return (
      <section>
        <h2 className="mb-4 font-display text-[20px] tracking-tight">{t('suggestionsTitle')}</h2>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-border" />
          ))}
        </div>
      </section>
    );
  }

  const suggestions = data?.suggestions ?? [];

  return (
    <section>
      <h2 className="mb-4 font-display text-[20px] tracking-tight">{t('suggestionsTitle')}</h2>
      {suggestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-[14px] text-muted">{t('suggestionsEmpty')}</p>
          <Link
            href="/study"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent/90"
          >
            {t('suggestionsEmptyCta')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div
              key={s.sentenceId}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <BilingualText en={s.sentenceTextEn} mr={s.sentenceTextMr} size="sm" />
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent ${s.subvirtueNameMr ? 'font-deva' : ''}`}
                  >
                    {s.subvirtueNameMr ?? s.subvirtueNameEn}
                  </span>
                  <span className="text-[11px] text-muted">{s.weaknessNameEn}</span>
                  <span className="text-[11px] text-muted">{t('scoreLabel', { score: s.score })}</span>
                </div>
              </div>
              <Link
                href={`/study?sentenceId=${s.sentenceId}`}
                className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent hover:text-fg"
              >
                {t('suggestionsStartJourney')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
