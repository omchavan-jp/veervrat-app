'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { RotateCcw, Lightbulb, Clock, Plus, Flag, ChevronRight, CheckCircle2 } from 'lucide-react';
import { actionsApi, type VaActions } from '@/lib/api/actions';
import { errorMessage } from '@/lib/api/error-message';
import { ercApi, type ErcType } from '@/lib/api/journeys';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageTitle } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
          {icon}
        </span>
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
  // Hairline rows, not raised cards (15a §4: rows aren't all elevated). bg-surface
  // gives a subtle lift against the page without a shadow on every item.
  const cls =
    'flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40';
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
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.actions.va,
    queryFn: () => actionsApi.getVaActions(),
  });

  const acknowledge = useMutation({
    mutationFn: ({
      journeyId,
      type,
      itemId,
    }: {
      journeyId: string;
      type: ErcType;
      itemId: string;
    }) => ercApi.acknowledgeSidenote(journeyId, type, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.va });
    },
    onError: (err) => toast({ title: errorMessage(err, t('acceptError')), variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[680px]">
        <PageTitle>{t('title')}</PageTitle>
        <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>
        <div className="mt-7 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[680px]">
        <PageTitle>{t('title')}</PageTitle>
        <EmptyState
          icon={<RotateCcw className="h-5 w-5" />}
          title={t('error')}
          description={t('errorHint')}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const d: VaActions = data;
  const meta = (ercType: string, journey: string) => t('metaLine', { ercType, journey });

  return (
    <div className="mx-auto max-w-[680px]">
      <PageTitle>{t('title')}</PageTitle>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      <div className="mt-7">
        {d.counts.total === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={t('empty')}
            description={t('emptyHint')}
          />
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
                  meta={meta(t(`ercType.${it.ercType}`), it.journeyTitle)}
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
                  meta={meta(t(`ercType.${s.ercType}`), s.journeyTitle)}
                  action={
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/journeys/${s.journeyId}`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'rounded-full',
                        )}
                      >
                        {t('view')}
                      </Link>
                      <Button
                        size="sm"
                        className="rounded-full"
                        loading={
                          acknowledge.isPending && acknowledge.variables?.itemId === s.itemId
                        }
                        disabled={
                          acknowledge.isPending && acknowledge.variables?.itemId === s.itemId
                        }
                        onClick={() =>
                          acknowledge.mutate({
                            journeyId: s.journeyId,
                            type: s.ercType,
                            itemId: s.itemId,
                          })
                        }
                      >
                        {t('accept')}
                      </Button>
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
                  meta={meta(t(`ercType.${it.ercType}`), it.journeyTitle)}
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
