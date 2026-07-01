'use client';

import { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Check, CircleDot, X, ChevronDown, Flame } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCheckins } from '@/hooks/use-journeys';
import type { CheckinStatus } from '@/lib/api/journeys';

type Props = {
  journeyId: string;
  resolutionId: string;
};

const STATUS_ICON: Record<CheckinStatus, typeof Check> = {
  DONE: Check,
  PARTIAL: CircleDot,
  MISSED: X,
};

const STATUS_STYLE: Record<CheckinStatus, string> = {
  DONE: 'text-success',
  PARTIAL: 'text-warning',
  MISSED: 'text-accent',
};

const STATUS_LABEL_KEY: Record<CheckinStatus, 'done' | 'partial' | 'missed'> = {
  DONE: 'done',
  PARTIAL: 'partial',
  MISSED: 'missed',
};

export function CheckinHistory({ journeyId, resolutionId }: Props) {
  const t = useTranslations('journey.checkin');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useCheckins(journeyId, resolutionId);

  function formatRelative(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { count: days });
    return format.dateTime(new Date(dateStr), { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const checkins = data?.checkins ?? [];
  const streak = data?.streak ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <div className="flex items-center gap-3">
        <CollapsibleTrigger className="group w-auto justify-start gap-1 text-[12px] text-muted hover:text-fg">
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform group-data-[panel-open]:rotate-180"
            aria-hidden="true"
          />
          {t('history', { count: checkins.length })}
        </CollapsibleTrigger>
        {streak > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
            aria-label={t('streak', { count: streak })}
          >
            <Flame className="h-3 w-3" aria-hidden="true" />
            {streak}
          </span>
        )}
      </div>

      <CollapsiblePanel>
        <div className="mt-2 space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
            </Alert>
          ) : checkins.length === 0 ? (
            <p className="text-[12px] text-muted">{t('empty')}</p>
          ) : (
            [...checkins]
              .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())
              .map((c) => {
                const Icon = STATUS_ICON[c.status];
                return (
                  <div key={c.id} className="flex items-start gap-2 text-[12px]">
                    <span className={`mt-0.5 ${STATUS_STYLE[c.status]}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{t(STATUS_LABEL_KEY[c.status])}</span>
                    </span>
                    <div className="flex-1">
                      <span className="text-muted">{formatRelative(c.checkedInAt)}</span>
                      {c.note && <span className="ml-2 text-fg">{c.note}</span>}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
