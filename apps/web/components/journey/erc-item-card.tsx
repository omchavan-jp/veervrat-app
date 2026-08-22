'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Repeat, Check } from 'lucide-react';
import type { JourneyErcItem, ErcType } from '@/lib/api/journeys';
import {
  useUpdateErcStatus,
  useDeactivateErc,
  useReactivateErc,
  useRemoveErc,
  useAcknowledgeSidenote,
  useApproveErc,
  useRevisitErc,
  useSuggestSidenote,
  useSubmitCustomForReview,
} from '@/hooks/use-journeys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BilingualText } from '@/components/shared/bilingual-text';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const sidenoteId = useId();
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

  // Surface every mutation failure with a toast so no action fails silently.
  const onError = (e: unknown) =>
    toast({
      title: t('actionError'),
      description: e instanceof Error ? e.message : undefined,
      variant: 'destructive',
    });

  const isPending =
    updateStatus.isPending ||
    deactivate.isPending ||
    reactivate.isPending ||
    remove.isPending ||
    submitForReview.isPending;
  // VM actions share a single guard so concurrent clicks on sibling controls are blocked.
  const vmPending =
    approve.isPending ||
    revisit.isPending ||
    suggestSidenote.isPending ||
    acknowledgeSidenote.isPending;

  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${item.isDeactivated ? 'border-dashed border-border opacity-50' : 'border-border bg-surface'}`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            {item.tier && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${TIER_BADGE[item.tier] ?? ''}`}
              >
                {TIER_LABEL_KEY[item.tier] ? t(TIER_LABEL_KEY[item.tier]) : item.tier}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[item.status] ?? ''}`}
            >
              {STATUS_LABEL_KEY[item.status] ? t(STATUS_LABEL_KEY[item.status]) : item.status}
            </span>
            {item.isDeactivated && (
              <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[11px] text-muted">
                {t('deactivated')}
              </span>
            )}
          </div>
          <BilingualText
            en={item.titleEn}
            mr={item.titleMr}
            size="sm"
            as="p"
            className="font-medium"
          />
          {(item.descriptionMr || item.descriptionEn) && (
            <BilingualText
              en={item.descriptionEn ?? ''}
              mr={item.descriptionMr}
              size="sm"
              as="div"
              className="mt-1 text-muted"
            />
          )}
          {item.frequencyLabel && (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
              <Repeat className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{t('frequency')}</span>
              {item.frequencyLabel}
            </p>
          )}
          {item.durationWeeks && (
            <p className="mt-0.5 text-[12px] text-muted">
              {t('weeks', { count: item.durationWeeks })}
            </p>
          )}
          {item.durationDays && (
            <p className="mt-0.5 text-[12px] text-muted">
              {t('days', { count: item.durationDays })}
            </p>
          )}
        </div>
      </div>

      {!viewerIsVm && (
        <div className="flex flex-wrap gap-2">
          {!item.isDeactivated && (
            <>
              {item.status === 'NOT_STARTED' && (
                <Button
                  size="sm"
                  onClick={() =>
                    updateStatus.mutate({ itemId: item.id, status: 'in_progress' }, { onError })
                  }
                  disabled={isPending}
                  className="bg-accent-2/10 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/20"
                >
                  {t('start')}
                </Button>
              )}
              {item.status === 'IN_PROGRESS' && (
                <Button
                  size="sm"
                  onClick={() =>
                    updateStatus.mutate({ itemId: item.id, status: 'submitted' }, { onError })
                  }
                  disabled={isPending}
                  className="bg-warning/10 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/20"
                >
                  {t('submitForClosure')}
                </Button>
              )}
              {item.status === 'SUBMITTED' && !hasVm && (
                <Button
                  size="sm"
                  onClick={() =>
                    updateStatus.mutate({ itemId: item.id, status: 'approved' }, { onError })
                  }
                  disabled={isPending}
                  className="bg-success/10 px-3 py-1.5 text-[12px] font-medium text-success hover:bg-success/20"
                >
                  {t('markAsDone')}
                </Button>
              )}
              {item.status === 'SUBMITTED' && hasVm && (
                <span className="text-[12px] text-muted">{t('awaitingVm')}</span>
              )}
              {/* Custom items can be submitted for global review (once, before any review) */}
              {item.isCustom && item.reviewStatus === null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitForReview.mutate({ itemId: item.id }, { onError })}
                  disabled={isPending}
                  className="border-accent-2/40 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/10"
                >
                  {t('submitForReview')}
                </Button>
              )}
              {item.isCustom && item.reviewStatus === 'pending' && (
                <span className="text-[12px] italic text-muted">{t('reviewPending')}</span>
              )}
              {item.status !== 'APPROVED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deactivate.mutate({ itemId: item.id }, { onError })}
                  disabled={isPending}
                  className="border-border-strong px-3 py-1.5 text-[12px] text-muted hover:bg-bg"
                >
                  {t('deactivate')}
                </Button>
              )}
            </>
          )}
          {item.isDeactivated && (
            <>
              <Button
                size="sm"
                onClick={() => reactivate.mutate({ itemId: item.id }, { onError })}
                disabled={isPending}
                className="bg-accent-2/10 px-3 py-1.5 text-[12px] text-accent-2 hover:bg-accent-2/20"
              >
                {t('reactivate')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove.mutate({ itemId: item.id }, { onError })}
                disabled={isPending}
                className="px-3 py-1.5 text-[12px] text-accent hover:underline"
              >
                {t('remove')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* VM actions — approve/revisit a submitted item, or attach a sidenote (spec/15-16) */}
      {viewerIsVm && (
        <div className="flex flex-wrap items-center gap-2">
          {item.status === 'SUBMITTED' && (
            <>
              <Button
                size="sm"
                onClick={() => approve.mutate({ itemId: item.id }, { onError })}
                disabled={vmPending}
                className="bg-success/12 px-3 py-1.5 text-[12px] font-medium text-success hover:bg-success/20"
              >
                {t('vmApprove')}
              </Button>
              <Button
                size="sm"
                onClick={() => revisit.mutate({ itemId: item.id }, { onError })}
                disabled={vmPending}
                className="bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent hover:bg-accent/20"
              >
                {t('vmRevisit')}
              </Button>
            </>
          )}
          {!item.vmSidenote && !composing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComposing(true)}
              disabled={vmPending}
              className="border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent hover:text-fg"
            >
              {t('vmAddSidenote')}
            </Button>
          )}
          {item.status !== 'SUBMITTED' && !composing && (
            <span className="text-[12px] italic text-muted">{t('vmAwaitingVa')}</span>
          )}
        </div>
      )}

      {viewerIsVm && composing && (
        <div className="mt-3 rounded-xl border border-border bg-bg p-3">
          <Label htmlFor={sidenoteId} className="sr-only">
            {t('vmAddSidenote')}
          </Label>
          <Textarea
            id={sidenoteId}
            value={sidenoteText}
            onChange={(e) => setSidenoteText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('vmSidenotePlaceholder')}
            className="resize-none bg-surface text-[13px]"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                suggestSidenote.mutate(
                  { itemId: item.id, text: sidenoteText.trim() },
                  {
                    onSuccess: () => {
                      setComposing(false);
                      setSidenoteText('');
                    },
                    onError,
                  },
                )
              }
              disabled={!sidenoteText.trim() || vmPending}
              className="bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent-hover"
            >
              {t('vmSidenoteSave')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setComposing(false);
                setSidenoteText('');
              }}
              className="border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
            >
              {t('vmSidenoteCancel')}
            </Button>
          </div>
        </div>
      )}

      {/* VM sidenote — guidance attached by the Vratmitra (spec/16). Acknowledgeable. */}
      {item.vmSidenote && (
        <div className="mt-3 rounded-xl border border-accent-2/20 bg-accent-2/[0.07] p-3.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-accent-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-2 text-[9px] font-semibold text-bg"
              aria-label={t('vmBadgeLabel')}
            >
              VM
            </span>
            {t('sidenoteFrom')}
          </div>
          <p className="text-[13px] leading-relaxed">{item.vmSidenote.text}</p>
          {item.vmSidenote.acknowledgedAt ? (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-success">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t('sidenoteAcknowledged')}
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => acknowledgeSidenote.mutate({ itemId: item.id }, { onError })}
              disabled={vmPending}
              className="mt-2.5 border-border-strong px-3 py-1.5 text-[12px] hover:border-accent hover:text-accent"
            >
              {t('sidenoteAcknowledge')}
            </Button>
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
