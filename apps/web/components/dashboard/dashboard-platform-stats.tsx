'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { queryKeys } from '@/lib/api/query-keys';
import { dashboardApi } from '@/lib/api/dashboard';
import { Button } from '@/components/ui/button';

const STALE_TIME = 55 * 60 * 1000;

export function DashboardPlatformStats() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const intlLocale = locale === 'mr' ? 'mr-IN' : 'en-IN';
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.platformStats,
    queryFn: dashboardApi.getPlatformStats,
    staleTime: STALE_TIME,
  });

  const stats: { label: string; value: number | undefined }[] = [
    { label: t('platformStatsVratarthis'), value: data?.vratarthis },
    { label: t('platformStatsVratmitras'), value: data?.vratmitras },
    { label: t('platformStatsTestsSolved'), value: data?.testsSolved },
    { label: t('platformStatsPracticeDays'), value: data?.practiceDaysCompleted },
  ];

  // Zone E — kept (product decision) but demoted to a quiet bottom strip: a single
  // borderless row across the page, low contrast, not competing with personal content
  // (15a §4/§5). Zero-state values render as "—", never a demoralizing "0".
  return (
    <div className="mt-12 border-t border-border pt-5">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {t('platformStatsTitle')}
      </div>
      {isError ? (
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span>{t('platformStatsError')}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RotateCcw className="mr-1 h-3 w-3" />
            {t('retry')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              {isLoading ? (
                <div className="h-4 w-8 animate-pulse rounded bg-border/60" />
              ) : (
                <span className="font-mono text-[15px] text-fg">
                  {typeof s.value === 'number' && s.value > 0
                    ? s.value.toLocaleString(intlLocale)
                    : '—'}
                </span>
              )}
              <span className="text-[12px] text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
