'use client';

import { useTranslations } from 'next-intl';
import type { JourneyErcItem, ErcType } from '@/lib/api/journeys';
import {
  useUpdateErcStatus, useDeactivateErc, useReactivateErc, useRemoveErc,
} from '@/hooks/use-journeys';

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'bg-muted/10 text-muted',
  IN_PROGRESS: 'bg-accent-2/10 text-accent-2',
  SUBMITTED: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REVISIT: 'bg-accent/10 text-accent',
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REVISIT: 'Revisit',
};

const TIER_BADGE: Record<string, string> = {
  LOCAL: 'border-border text-muted',
  NATIONAL: 'border-accent-2/40 text-accent-2',
  INTERNATIONAL: 'border-accent/40 text-accent',
};

type Props = {
  item: JourneyErcItem;
  ercType: ErcType;
  journeyId: string;
  hasVm: boolean;
};

export function ErcItemCard({ item, ercType, journeyId, hasVm }: Props) {
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
                {item.tier.charAt(0) + item.tier.slice(1).toLowerCase()}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[item.status] ?? ''}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            {item.isDeactivated && (
              <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[11px] text-muted">Deactivated</span>
            )}
          </div>
          <p className="text-[14px] font-medium">{item.titleEn}</p>
          {item.descriptionEn && <p className="mt-0.5 text-[13px] text-muted">{item.descriptionEn}</p>}
          {item.frequencyLabel && <p className="mt-0.5 text-[12px] text-muted">🔁 {item.frequencyLabel}</p>}
          {item.durationWeeks && <p className="mt-0.5 text-[12px] text-muted">{item.durationWeeks} week{item.durationWeeks !== 1 ? 's' : ''}</p>}
          {item.durationDays && <p className="mt-0.5 text-[12px] text-muted">{item.durationDays} day{item.durationDays !== 1 ? 's' : ''}</p>}
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
                Start
              </button>
            )}
            {item.status === 'IN_PROGRESS' && (
              <button
                onClick={() => updateStatus.mutate({ itemId: item.id, status: 'submitted' })}
                disabled={isPending}
                className="rounded-lg bg-warning/10 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/20 disabled:opacity-40"
              >
                Submit for closure
              </button>
            )}
            {item.status === 'SUBMITTED' && !hasVm && (
              <button
                onClick={() => updateStatus.mutate({ itemId: item.id, status: 'approved' })}
                disabled={isPending}
                className="rounded-lg bg-success/10 px-3 py-1.5 text-[12px] font-medium text-success hover:bg-success/20 disabled:opacity-40"
              >
                Mark as done
              </button>
            )}
            {item.status === 'SUBMITTED' && hasVm && (
              <span className="text-[12px] text-muted">Awaiting VM approval</span>
            )}
            {item.status !== 'APPROVED' && (
              <button
                onClick={() => deactivate.mutate({ itemId: item.id })}
                disabled={isPending}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:bg-bg disabled:opacity-40"
              >
                Deactivate
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
              Reactivate
            </button>
            <button
              onClick={() => remove.mutate({ itemId: item.id })}
              disabled={isPending}
              className="rounded-lg px-3 py-1.5 text-[12px] text-accent hover:underline disabled:opacity-40"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
