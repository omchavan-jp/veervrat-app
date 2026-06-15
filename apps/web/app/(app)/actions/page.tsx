'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { RotateCcw, Lightbulb, Clock, Plus, Flag, ChevronRight, CheckCircle2 } from 'lucide-react';
import { actionsApi, type VaActions } from '@/lib/api/actions';
import { ercApi, type ErcType } from '@/lib/api/journeys';
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

function Row({
  href,
  titleEn,
  titleMr,
  meta,
  action,
}: {
  href?: string;
  titleEn: string;
  titleMr?: string | null;
  meta?: string;
  action?: React.ReactNode;
}) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <BilingualText en={titleEn} mr={titleMr} size="sm" />
        {meta && <div className="mt-1 text-[12px] text-muted">{meta}</div>}
      </div>
      {action ?? (href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted" /> : null)}
    </>
  );
  const cls =
    'flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent/25';
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function ActionsPage() {
  const t = useTranslations('actions');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.actions.va,
    queryFn: () => actionsApi.getVaActions(),
  });

  const acknowledge = useMutation({
    mutationFn: ({ journeyId, type, itemId }: { journeyId: string; type: ErcType; itemId: string }) =>
      ercApi.acknowledgeSidenote(journeyId, type, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.va });
    },
  });

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

  const d: VaActions = data;
  const meta = (journey: string) => t('inJourney', { journey });

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
              icon={<RotateCcw className="h-[15px] w-[15px]" />}
              tint="bg-accent/12 text-accent"
              title={t('sections.ercRevisit')}
              count={d.ercRevisit.length}
            >
              {d.ercRevisit.map((it) => (
                <Row
                  key={it.id}
                  href={`/journeys/${it.journeyId}`}
                  titleEn={it.titleEn}
                  titleMr={it.titleMr}
                  meta={`${t(`ercType.${it.ercType}`)} · ${meta(it.journeyTitle)}`}
                />
              ))}
            </SectionShell>

            <SectionShell
              icon={<Lightbulb className="h-[15px] w-[15px]" />}
              tint="bg-accent-2/12 text-accent-2"
              title={t('sections.suggestionsAwaitingDecision')}
              count={d.suggestionsAwaitingDecision.length}
            >
              {d.suggestionsAwaitingDecision.map((s) => (
                <Row
                  key={s.id}
                  titleEn={s.itemTitleEn}
                  titleMr={s.itemTitleMr}
                  meta={`${t(`ercType.${s.ercType}`)} · ${meta(s.journeyTitle)}`}
                  action={
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/journeys/${s.journeyId}`}
                        className="rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent"
                      >
                        {t('view')}
                      </Link>
                      <button
                        onClick={() =>
                          acknowledge.mutate({ journeyId: s.journeyId, type: s.ercType, itemId: s.itemId })
                        }
                        disabled={acknowledge.isPending}
                        className="rounded-full bg-accent px-3 py-1.5 text-[12px] text-bg disabled:opacity-50"
                      >
                        {t('accept')}
                      </button>
                    </div>
                  }
                />
              ))}
            </SectionShell>

            <SectionShell
              icon={<Clock className="h-[15px] w-[15px]" />}
              tint="bg-warning/16 text-warning"
              title={t('sections.pendingVmApprovals')}
              count={d.pendingVmApprovals.length}
            >
              {d.pendingVmApprovals.map((it) => (
                <Row
                  key={it.id}
                  href={`/journeys/${it.journeyId}`}
                  titleEn={it.titleEn}
                  titleMr={it.titleMr}
                  meta={`${t(`ercType.${it.ercType}`)} · ${meta(it.journeyTitle)}`}
                />
              ))}
            </SectionShell>

            <SectionShell
              icon={<Plus className="h-[15px] w-[15px]" />}
              tint="bg-success/13 text-success"
              title={t('sections.newErcAvailable')}
              count={d.newErcAvailable.length}
            >
              {d.newErcAvailable.map((j) => (
                <Row key={j.journeyId} href={`/journeys/${j.journeyId}`} titleEn={j.journeyTitle} />
              ))}
            </SectionShell>

            <SectionShell
              icon={<Flag className="h-[15px] w-[15px]" />}
              tint="bg-accent/12 text-accent"
              title={t('sections.journeyClosurePending')}
              count={d.journeyClosurePending.length}
            >
              {d.journeyClosurePending.map((j) => (
                <Row key={j.id} href={`/journeys/${j.id}`} titleEn={j.title} />
              ))}
            </SectionShell>
          </>
        )}
      </div>
    </div>
  );
}
