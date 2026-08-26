'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Check, X } from 'lucide-react';
import { moderationApi, type ModReviewDetail } from '@/lib/api/moderation';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/error-message';

export default function CustomErcReviewPage() {
  const t = useTranslations('moderation');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const isMod = (user?.roles ?? []).some((r) => r === 'MODERATOR' || r === 'ADMIN');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && !isMod) router.replace('/dashboard');
  }, [isLoading, user, isMod, router]);

  const queue = useQuery({
    queryKey: queryKeys.moderation.customErcQueue,
    queryFn: () => moderationApi.getQueue(),
    enabled: isMod,
  });

  const detail = useQuery({
    queryKey: queryKeys.moderation.customErcDetail(selectedId ?? ''),
    queryFn: () => moderationApi.getDetail(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.moderation.customErcQueue });
    setSelectedId(null);
  };

  const approve = useMutation({
    mutationFn: (id: string) => moderationApi.approve(id),
    onSuccess: () => {
      invalidate();
      toast({ title: t('approved') });
    },
    onError: (err) => toast({ title: errorMessage(err, t('actionError')), variant: 'destructive' }),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      moderationApi.reject(id, reason),
    onSuccess: () => {
      invalidate();
      toast({ title: t('rejected') });
    },
    onError: (err) => toast({ title: errorMessage(err, t('actionError')), variant: 'destructive' }),
  });

  // While auth resolves, isMod is false but no redirect has fired — show a spinner
  // rather than a blank flash, and only return null once auth has resolved.
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={tCommon('loading')} />
      </div>
    );
  }

  if (!isMod) return null;

  const items = queue.data?.items ?? [];

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="font-display text-[28px] font-medium tracking-tight">{t('customErcTitle')}</h1>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(240px,300px)_1fr]">
        {/* Queue */}
        <div>
          {queue.isLoading ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <Spinner size="lg" label={tCommon('loading')} />
            </div>
          ) : queue.isError ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="flex flex-col gap-2 text-destructive">
                {t('queueError')}
                <Button size="sm" variant="outline" onClick={() => queue.refetch()}>
                  {tCommon('status.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <EmptyState icon={<FileCheck className="h-5 w-5" />} title={t('emptyQueue')} />
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelectedId(it.id)}
                  aria-pressed={selectedId === it.id}
                  className={`block w-full rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${selectedId === it.id ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/30'}`}
                >
                  <div className="truncate text-[14px] font-medium">{it.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {t(`entityType.${it.entityType}`)} · {it.submitter?.displayName ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {!selectedId ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-[13px] text-muted">
              {t('selectSubmission')}
            </div>
          ) : detail.isError ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="flex flex-col gap-2 text-destructive">
                {t('detailError')}
                <Button size="sm" variant="outline" onClick={() => detail.refetch()}>
                  {tCommon('status.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : detail.isLoading || !detail.data ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Spinner size="lg" label={tCommon('loading')} />
            </div>
          ) : (
            <ReviewDetail
              data={detail.data}
              busy={approve.isPending || reject.isPending}
              onApprove={() => approve.mutate(detail.data!.id)}
              onReject={(reason) => reject.mutate({ id: detail.data!.id, reason })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewDetail({
  data,
  busy,
  onApprove,
  onReject,
}: {
  data: ModReviewDetail;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const t = useTranslations('moderation');
  const locale = useLocale();
  const isMr = locale === 'mr';
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Locale-aware content selection: prefer Marathi when the moderator's locale is mr
  // and a Marathi value exists, otherwise fall back to English.
  const pick = (en: string, mr: string | null | undefined) => (isMr && mr ? mr : en);

  // Localized duration suffix: weeks/days. Tier and ercType map through translated labels.
  const durationLabel = data.item.durationWeeks
    ? t('durationWeeks', { count: data.item.durationWeeks })
    : data.item.durationDays
      ? t('durationDays', { count: data.item.durationDays })
      : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      {/* Context (read-only) */}
      {data.journey && (
        <div className="mb-4 rounded-xl bg-bg p-3 text-[13px]">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {t('context')}
          </div>
          <div className="text-muted">
            {t('submittedBy', { name: data.submitter?.displayName ?? '—' })}
          </div>
          <div className="mt-1">{data.journey.title}</div>
          <div className="mt-1 text-muted">
            {pick(data.journey.sentence.textEn, data.journey.sentence.textMr)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] text-accent">
              {pick(
                data.journey.sentence.subvirtue.virtue.nameEn,
                data.journey.sentence.subvirtue.virtue.nameMr,
              )}
            </span>
            <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[11px] text-accent-2">
              {pick(data.journey.sentence.subvirtue.nameEn, data.journey.sentence.subvirtue.nameMr)}
            </span>
            {data.journey.weaknesses.map((w) => (
              <span
                key={w.id}
                className="rounded-full bg-muted/15 px-2 py-0.5 text-[11px] text-muted"
              >
                {pick(w.nameEn, w.nameMr)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ERC content */}
      <div className="mb-4">
        <BilingualText en={data.item.titleEn} mr={data.item.titleMr} size="md" />
        {data.item.descriptionEn && (
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {pick(data.item.descriptionEn, data.item.descriptionMr)}
          </p>
        )}
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {t(`ercTypeLabel.${data.ercType}`)}
          {data.item.tier ? ` · ${t(`tier.${data.item.tier.toLowerCase()}`)}` : ''}
          {durationLabel ? ` · ${durationLabel}` : ''}
        </div>
      </div>

      {/* Actions */}
      {rejecting ? (
        <div className="space-y-2">
          <Label htmlFor="reject-reason" className="sr-only">
            {t('rejectReasonLabel')}
          </Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectReasonPlaceholder')}
            className="h-20 resize-none rounded-xl text-[13px]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={busy || !reason.trim()}
              onClick={() => onReject(reason.trim())}
            >
              {t('confirmReject')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check className="h-4 w-4" />
            <span className="ml-1.5">{t('approve')}</span>
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
            <X className="h-4 w-4" />
            <span className="ml-1.5">{t('reject')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
