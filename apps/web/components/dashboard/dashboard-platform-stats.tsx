'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';

const STALE_TIME = 55 * 60 * 1000;

export function DashboardPlatformStats() {
  const t = useTranslations('dashboard');
  const { data } = useQuery({
    queryKey: queryKeys.dashboard.platformStats,
    queryFn: dashboardApi.getPlatformStats,
    staleTime: STALE_TIME,
  });

  const stats = [
    { label: t('platformStatsVratarthis'), value: data?.vratarthis ?? '—' },
    { label: t('platformStatsVratmitras'), value: data?.vratmitras ?? '—' },
    { label: t('platformStatsTestsSolved'), value: data?.testsSolved ?? '—' },
    { label: t('platformStatsPracticeDays'), value: data?.practiceDaysCompleted ?? '—' },
  ];

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {t('platformStatsTitle')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
            <div className="font-mono text-[20px] font-semibold text-fg">{s.value.toLocaleString()}</div>
            <div className="mt-0.5 text-[11px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
