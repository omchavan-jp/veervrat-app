'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';

export function DashboardStatsBar() {
  const t = useTranslations('dashboard');
  const { data } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardApi.getStats,
  });

  if (!data) {
    return (
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-32 animate-pulse rounded-full bg-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5">
        <span className="font-mono text-[15px] font-semibold text-accent">{data.virtues.count}</span>
        <span className="text-[13px] text-fg">{t('statsVirtues', { count: data.virtues.count })}</span>
        <span className="mx-1 text-muted">·</span>
        <span className="font-mono text-[15px] font-semibold text-accent">{data.subvirtues.count}</span>
        <span className="text-[13px] text-fg">{t('statsSubvirtues', { count: data.subvirtues.count })}</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <span className="text-[13px] text-muted">
        {t('statsJourneysActive', { count: data.journeys.active })}
        {data.journeys.completed > 0 && ` · ${t('statsJourneysCompleted', { count: data.journeys.completed })}`}
      </span>
      <span className="text-[13px] text-muted">{t('statsWeaknesses', { count: data.weaknesses.explored })}</span>
      <span className="text-[13px] text-muted">{t('statsTests', { count: data.tests.taken })}</span>
    </div>
  );
}
