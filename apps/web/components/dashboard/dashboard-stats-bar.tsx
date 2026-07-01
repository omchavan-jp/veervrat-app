'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';
import { Button } from '@/components/ui/button';

export function DashboardStatsBar() {
  const t = useTranslations('dashboard');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardApi.getStats,
  });

  if (isLoading) {
    return <div className="mb-8 h-5 w-2/3 max-w-md animate-pulse rounded bg-border/60" />;
  }

  if (isError || !data) {
    return (
      <div className="mb-8 flex items-center gap-2 text-[13px] text-muted">
        <span>{t('statsError')}</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RotateCcw className="mr-1 h-3 w-3" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  // Zone B — one dense, borderless row of personal counts (15a §5: status = dense, no
  // cards). Each metric appears exactly once (15a §1 / IA dedupe). The active-journey
  // count is the only lightly-emphasized value since it's the one tied to the hero.
  const dot = <span className="text-border-strong" aria-hidden="true">·</span>;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
      <span>{t('statsVirtues', { count: data.virtues.count })}</span>
      {dot}
      <span>{t('statsSubvirtues', { count: data.subvirtues.count })}</span>
      {dot}
      <span className="text-fg">
        {t('statsJourneysActive', { count: data.journeys.active })}
        {data.journeys.completed > 0 && ` · ${t('statsJourneysCompleted', { count: data.journeys.completed })}`}
      </span>
      {dot}
      <span>{t('statsWeaknesses', { count: data.weaknesses.explored })}</span>
      {dot}
      <span>{t('statsTests', { count: data.tests.taken })}</span>
    </div>
  );
}
