'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCheckins } from '@/hooks/use-journeys';
import type { CheckinStatus } from '@/lib/api/journeys';

type Props = {
  journeyId: string;
  resolutionId: string;
};

const STATUS_ICON: Record<CheckinStatus, string> = {
  DONE: '✓',
  PARTIAL: '◑',
  MISSED: '✗',
};

const STATUS_STYLE: Record<CheckinStatus, string> = {
  DONE: 'text-success',
  PARTIAL: 'text-warning',
  MISSED: 'text-accent',
};

export function CheckinHistory({ journeyId, resolutionId }: Props) {
  const t = useTranslations('journey.checkin');
  const [open, setOpen] = useState(false);
  const { data } = useCheckins(journeyId, resolutionId);

  function formatRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { count: days });
    return new Date(dateStr).toLocaleDateString();
  }

  const checkins = data?.checkins ?? [];
  const streak = data?.streak ?? 0;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[12px] text-muted hover:text-foreground"
        >
          {open ? '▾' : '▸'} {t('history', { count: checkins.length })}
        </button>
        {streak > 0 && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
            🔥 {streak}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-1.5">
          {checkins.length === 0 ? (
            <p className="text-[12px] text-muted">{t('empty')}</p>
          ) : (
            [...checkins].sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()).map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-[12px]">
                <span className={`mt-0.5 font-bold ${STATUS_STYLE[c.status]}`}>
                  {STATUS_ICON[c.status]}
                </span>
                <div className="flex-1">
                  <span className="text-muted">{formatRelative(c.checkedInAt)}</span>
                  {c.note && <span className="ml-2 text-foreground">{c.note}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
