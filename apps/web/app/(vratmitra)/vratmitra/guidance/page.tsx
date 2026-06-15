'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Check, RotateCcw, Flag, Lightbulb, FileCheck, CheckCircle2 } from 'lucide-react';
import { actionsApi, type VmActions } from '@/lib/api/actions';
import { ercApi, journeysApi, type ErcType } from '@/lib/api/journeys';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';

function SectionShell({
  icon,
  tint,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
        <h2 className="text-[15px] font-medium">{title}</h2>
        <span className="font-mono text-[11px] text-muted">{count}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function ClosureCard({
  titleEn,
  titleMr,
  meta,
  onApprove,
  onReturn,
  pending,
}: {
  titleEn: string;
  titleMr: string | null;
  meta: string;
  onApprove: () => void;
  onReturn: (note: string) => void;
  pending: boolean;
}) {
  const t = useTranslations('vm_guidance');
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <BilingualText en={titleEn} mr={titleMr} size="sm" />
          <div className="mt-1 text-[12px] text-muted">{meta}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setReturning((v) => !v)}
            className="rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
          >
            {t('return')}
          </button>
          <button
            onClick={onApprove}
            disabled={pending}
            className="rounded-full bg-accent px-3 py-1.5 text-[12px] text-bg disabled:opacity-50"
          >
            {t('approve')}
          </button>
        </div>
      </div>
      {returning && (
        <div className="mt-3 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <button
            onClick={() => onReturn(note)}
            disabled={pending}
            className="rounded-lg border border-border-strong px-3 py-2 text-[12px] hover:border-accent disabled:opacity-50"
          >
            {t('return')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function VmGuidancePage() {
  const t = useTranslations('vm_guidance');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.actions.vm,
    queryFn: () => actionsApi.getVmActions(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.actions.vm });
  };

  const approveErc = useMutation({
    mutationFn: ({ journeyId, type, itemId }: { journeyId: string; type: ErcType; itemId: string }) =>
      ercApi.approve(journeyId, type, itemId),
    onSuccess: invalidate,
  });
  const revisitErc = useMutation({
    mutationFn: ({ journeyId, type, itemId }: { journeyId: string; type: ErcType; itemId: string; note?: string }) =>
      ercApi.revisit(journeyId, type, itemId),
    onSuccess: invalidate,
  });
  const approveJourney = useMutation({
    mutationFn: (journeyId: string) => journeysApi.completeApprove(journeyId),
    onSuccess: invalidate,
  });

  const mutating = approveErc.isPending || revisitErc.isPending || approveJourney.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[680px]">
        <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
        <EmptyState
          icon={<RotateCcw className="h-5 w-5" />}
          title={t('error')}
          description={t('errorHint')}
          action={
            <button
              onClick={() => refetch()}
              className="rounded-full border border-border-strong px-4 py-1.5 text-[13px] hover:border-accent"
            >
              {t('retry')}
            </button>
          }
        />
      </div>
    );
  }

  const d: VmActions = data;
  const from = (va: string) => t('from', { va });

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-7">
        {d.counts.total === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={t('empty')} description={t('emptyHint')} />
        ) : (
          <>
            <SectionShell
              icon={<Check className="h-[15px] w-[15px]" />}
              tint="bg-warning/16 text-warning"
              title={t('sections.closureRequests')}
              count={d.closureRequests.length}
            >
              {d.closureRequests.map((it) => (
                <ClosureCard
                  key={it.id}
                  titleEn={it.titleEn}
                  titleMr={it.titleMr}
                  meta={`${t(`ercType.${it.ercType}`)} · ${from(it.journeyTitle)}`}
                  pending={mutating}
                  onApprove={() => approveErc.mutate({ journeyId: it.journeyId, type: it.ercType, itemId: it.id })}
                  onReturn={() => revisitErc.mutate({ journeyId: it.journeyId, type: it.ercType, itemId: it.id })}
                />
              ))}
            </SectionShell>

            <SectionShell
              icon={<Flag className="h-[15px] w-[15px]" />}
              tint="bg-accent/12 text-accent"
              title={t('sections.journeyCompletionRequests')}
              count={d.journeyCompletionRequests.length}
            >
              {d.journeyCompletionRequests.map((j) => (
                <div key={j.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="min-w-0 flex-1">
                    <BilingualText en={j.title} size="sm" />
                  </div>
                  <button
                    onClick={() => approveJourney.mutate(j.id)}
                    disabled={mutating}
                    className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[12px] text-bg disabled:opacity-50"
                  >
                    {t('approveJourney')}
                  </button>
                </div>
              ))}
            </SectionShell>

            <SectionShell
              icon={<Lightbulb className="h-[15px] w-[15px]" />}
              tint="bg-accent-2/12 text-accent-2"
              title={t('sections.suggestionStatusUpdates')}
              count={d.suggestionStatusUpdates.length}
            >
              {d.suggestionStatusUpdates.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="min-w-0 flex-1">
                    <BilingualText en={s.itemTitleEn} mr={s.itemTitleMr} size="sm" />
                    <div className="mt-1 text-[12px] text-muted">{from(s.journeyTitle)}</div>
                  </div>
                  <span className={`shrink-0 text-[12px] ${s.acknowledgedAt ? 'text-success' : 'text-muted'}`}>
                    {s.acknowledgedAt ? t('acknowledged') : t('awaiting')}
                  </span>
                </div>
              ))}
            </SectionShell>

            <SectionShell
              icon={<FileCheck className="h-[15px] w-[15px]" />}
              tint="bg-muted/15 text-muted"
              title={t('sections.customErcReviewStatus')}
              count={d.customErcReviewStatus.length}
            >
              {d.customErcReviewStatus.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px]">{t(`ercType.${c.ercType}`)}</div>
                    <div className="mt-1 text-[12px] text-muted">{from(c.journeyTitle)}</div>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted">{t(`reviewStatus.${c.status}`)}</span>
                </div>
              ))}
            </SectionShell>
          </>
        )}
      </div>
    </div>
  );
}
