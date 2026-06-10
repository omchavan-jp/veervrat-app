'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { JourneyErcItem, ErcType } from '@/lib/api/journeys';
import {
  useUpdateErcStatus, useDeactivateErc, useReactivateErc, useRemoveErc, useAcknowledgeSidenote,
  useApproveErc, useRevisitErc, useSuggestSidenote, useSubmitCustomForReview,
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
  // When true, the viewer is the journey's VM — show VM actions (approve/revisit/sidenote)
  // instead of the VA's own-item actions.
  viewerIsVm?: boolean;
};

export function ErcItemCard({ item, ercType, journeyId, hasVm, viewerIsVm = false }: Props) {
  const t = useTranslations('journey.erc');
  const updateStatus = useUpdateErcStatus(journeyId, ercType);
  const deactivate = useDeactivateErc(journeyId, ercType);
  const reactivate = useReactivateErc(journeyId, ercType);
  const remove = useRemoveErc(journeyId, ercType);
  const acknowledgeSidenote = useAcknowledgeSidenote(journeyId, ercType);
  const approve = useApproveErc(journeyId, ercType);
  const revisit = useRevisitErc(journeyId, ercType);
  const suggestSidenote = useSuggestSidenote(journeyId, ercType);
  const submitForReview = useSubmitCustomForReview(journeyId, ercType);

  const [composing, setComposing] = useState(false);
  const [sidenoteText, setSidenoteText] = useState('');

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

      {!viewerIsVm && (
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
            {/* Custom items can be submitted for global review (once, before any review) */}
            {item.isCustom && item.reviewStatus === null && (
              <button
                onClick={() => submitForReview.mutate({ itemId: item.id })}
                disabled={submitForReview.isPending}
                className="rounded-lg border border-accent-2/40 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/10 disabled:opacity-40"
              >
                {t('submitForReview')}
              </button>
            )}
            {item.isCustom && item.reviewStatus === 'pending' && (
              <span className="text-[12px] italic text-muted">{t('reviewPending')}</span>
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
      )}

      {/* VM actions — approve/revisit a submitted item, or attach a sidenote (spec/15-16) */}
      {viewerIsVm && (
        <div className="flex flex-wrap items-center gap-2">
          {item.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => approve.mutate({ itemId: item.id })}
                disabled={approve.isPending || revisit.isPending}
                className="rounded-lg bg-success/12 px-3 py-1.5 text-[12px] font-medium text-success hover:bg-success/20 disabled:opacity-40"
              >
                {t('vmApprove')}
              </button>
              <button
                onClick={() => revisit.mutate({ itemId: item.id })}
                disabled={approve.isPending || revisit.isPending}
                className="rounded-lg bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
              >
                {t('vmRevisit')}
              </button>
            </>
          )}
          {!item.vmSidenote && !composing && (
            <button
              onClick={() => setComposing(true)}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent hover:text-fg"
            >
              {t('vmAddSidenote')}
            </button>
          )}
          {item.status !== 'SUBMITTED' && !composing && (
            <span className="text-[12px] italic text-muted">{t('vmAwaitingVa')}</span>
          )}
        </div>
      )}

      {viewerIsVm && composing && (
        <div className="mt-3 rounded-xl border border-border bg-bg p-3">
          <textarea
            value={sidenoteText}
            onChange={(e) => setSidenoteText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('vmSidenotePlaceholder')}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                suggestSidenote.mutate(
                  { itemId: item.id, text: sidenoteText.trim() },
                  { onSuccess: () => { setComposing(false); setSidenoteText(''); } },
                )
              }
              disabled={!sidenoteText.trim() || suggestSidenote.isPending}
              className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent-hover disabled:opacity-40"
            >
              {t('vmSidenoteSave')}
            </button>
            <button
              onClick={() => { setComposing(false); setSidenoteText(''); }}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
            >
              {t('vmSidenoteCancel')}
            </button>
          </div>
        </div>
      )}

      {/* VM sidenote — guidance attached by the Vratmitra (spec/16). Acknowledgeable. */}
      {item.vmSidenote && (
        <div className="mt-3 rounded-xl border border-accent-2/20 bg-accent-2/[0.07] p-3.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-accent-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-2 text-[9px] font-semibold text-bg">
              VM
            </span>
            {t('sidenoteFrom')}
          </div>
          <p className="text-[13px] leading-relaxed">{item.vmSidenote.text}</p>
          {item.vmSidenote.acknowledgedAt ? (
            <p className="mt-2 text-[11px] text-success">✓ {t('sidenoteAcknowledged')}</p>
          ) : (
            <button
              onClick={() => acknowledgeSidenote.mutate({ itemId: item.id })}
              disabled={acknowledgeSidenote.isPending}
              className="mt-2.5 rounded-lg border border-border-strong px-3 py-1.5 text-[12px] transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              {t('sidenoteAcknowledge')}
            </button>
          )}
        </div>
      )}

      {ercType === 'resolution' && item.status === 'IN_PROGRESS' && !item.isDeactivated && (
        <CheckinForm journeyId={journeyId} resolutionId={item.id} />
      )}

      {ercType === 'resolution' && item.status !== 'NOT_STARTED' && !item.isDeactivated && (
        <CheckinHistory journeyId={journeyId} resolutionId={item.id} />
      )}
    </div>
  );
}
