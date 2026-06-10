'use client';

import { useTranslations } from 'next-intl';
import type { JourneyErcItem, ErcType } from '@/lib/api/journeys';
import {
  useUpdateErcStatus, useDeactivateErc, useReactivateErc, useRemoveErc,
} from '@/hooks/use-journeys';
import { CheckinForm } from './checkin-form';
import { CheckinHistory } from './checkin-history';

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'bg-muted/10 text-muted',
  IN_PROGRESS: 'bg-accent-2/10 text-accent-2',
  SUBMITTED: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REVISIT: 'bg-accent/10 text-accent',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  NOT_STARTED: 'statusNotStarted',
  IN_PROGRESS: 'statusInProgress',
  SUBMITTED: 'statusSubmitted',
  APPROVED: 'statusApproved',
  REVISIT: 'statusRevisit',
};

const TIER_BADGE: Record<string, string> = {
  LOCAL: 'border-border text-muted',
  NATIONAL: 'border-accent-2/40 text-accent-2',
  INTERNATIONAL: 'border-accent/40 text-accent',
};

const TIER_LABEL_KEY: Record<string, string> = {
  LOCAL: 'tierLocal',
  NATIONAL: 'tierNational',
  INTERNATIONAL: 'tierInternational',
};

type Props = {
  item: JourneyErcItem;
  ercType: ErcType;
  journeyId: string;
  hasVm: boolean;
};

export function ErcItemCard({ item, ercType, journeyId, hasVm }: Props) {
  const t = useTranslations('journey.erc');
  const updateStatus = useUpdateErcStatus(journeyId, ercType);
  const deactivate = useDeactivateErc(journeyId, ercType);
  const reactivate = useReactivateErc(journeyId, ercType);
  const remove = useRemoveErc(journeyId, ercType);

  const isPending = updateStatus.isPending || deactivate.isPending || reactivate.isPending || remove.isPending;

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${item.isDeactivated ? 'border-dashed border-border opacity-50' : 'border-border bg-surface'}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            {item.tier && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${TIER_BADGE[item.tier] ?? ''}`}>
                {TIER_LABEL_KEY[item.tier] ? t(TIER_LABEL_KEY[item.tier]) : item.tier}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[item.status] ?? ''}`}>
              {STATUS_LABEL_KEY[item.status] ? t(STATUS_LABEL_KEY[item.status]) : item.status}
            </span>
            {item.isDeactivated && (
              <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[11px] text-muted">{t('deactivated')}</span>
            )}
          </div>
          <p className="text-[14px] font-medium">{item.titleEn}</p>
          {item.descriptionEn && <p className="mt-0.5 text-[13px] text-muted">{item.descriptionEn}</p>}
          {item.frequencyLabel && <p className="mt-0.5 text-[12px] text-muted">🔁 {item.frequencyLabel}</p>}
          {item.durationWeeks && <p className="mt-0.5 text-[12px] text-muted">{t('weeks', { count: item.durationWeeks })}</p>}
          {item.durationDays && <p className="mt-0.5 text-[12px] text-muted">{t('days', { count: item.durationDays })}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!item.isDeactivated && (
          <>
            {item.status === 'NOT_STARTED' && (
              <button
                onClick={() => updateStatus.mutate({ itemId: item.id, status: 'in_progress' })}
                disabled={isPending}
                className="rounded-lg bg-accent-2/10 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/20 disabled:opacity-40"
              >
                {t('start')}
              </button>
            )}
            {item.status === 'IN_PROGRESS' && (
              <button
                onClick={() => updateStatus.mutate({ itemId: item.id, status: 'submitted' })}
                disabled={isPending}
                className="rounded-lg bg-warning/10 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/20 disabled:opacity-40"
              >
                {t('submitForClosure')}
              </button>
            )}
            {item.status === 'SUBMITTED' && !hasVm && (
              <button
                onClick={() => updateStatus.mutate({ itemId: item.id, status: 'approved' })}
                disabled={isPending}
                className="rounded-lg bg-success/10 px-3 py-1.5 text-[12px] font-medium text-success hover:bg-success/20 disabled:opacity-40"
              >
                {t('markAsDone')}
              </button>
            )}
            {item.status === 'SUBMITTED' && hasVm && (
              <span className="text-[12px] text-muted">{t('awaitingVm')}</span>
            )}
            {item.status !== 'APPROVED' && (
              <button
                onClick={() => deactivate.mutate({ itemId: item.id })}
                disabled={isPending}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:bg-bg disabled:opacity-40"
              >
                {t('deactivate')}
              </button>
            )}
          </>
        )}
        {item.isDeactivated && (
          <>
            <button
              onClick={() => reactivate.mutate({ itemId: item.id })}
              disabled={isPending}
              className="rounded-lg bg-accent-2/10 px-3 py-1.5 text-[12px] text-accent-2 hover:bg-accent-2/20 disabled:opacity-40"
            >
              {t('reactivate')}
            </button>
            <button
              onClick={() => remove.mutate({ itemId: item.id })}
              disabled={isPending}
              className="rounded-lg px-3 py-1.5 text-[12px] text-accent hover:underline disabled:opacity-40"
            >
              {t('remove')}
            </button>
          </>
        )}
      </div>

      {ercType === 'resolution' && item.status === 'IN_PROGRESS' && !item.isDeactivated && (
        <CheckinForm journeyId={journeyId} resolutionId={item.id} />
      )}

      {ercType === 'resolution' && item.status !== 'NOT_STARTED' && !item.isDeactivated && (
        <CheckinHistory journeyId={journeyId} resolutionId={item.id} />
      )}
    </div>
  );
}
