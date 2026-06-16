'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Check, X } from 'lucide-react';
import { moderationApi, type ModReviewDetail } from '@/lib/api/moderation';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CustomErcReviewPage() {
  const t = useTranslations('moderation');
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
    onSuccess: () => { invalidate(); toast({ title: t('approved') }); },
    onError: () => toast({ title: t('actionError'), variant: 'destructive' }),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => moderationApi.reject(id, reason),
    onSuccess: () => { invalidate(); toast({ title: t('rejected') }); },
    onError: () => toast({ title: t('actionError'), variant: 'destructive' }),
  });

  if (!isMod) return null;

  const items = queue.data?.items ?? [];

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="font-display text-[28px] font-medium tracking-tight">{t('customErcTitle')}</h1>

      <div className="mt-6 grid gap-5 md:grid-cols-[280px_1fr]">
        {/* Queue */}
        <div>
          {queue.isLoading ? (
            <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={<FileCheck className="h-5 w-5" />} title={t('emptyQueue')} />
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelectedId(it.id)}
                  className={`block w-full rounded-xl border p-3 text-left transition-colors ${selectedId === it.id ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/30'}`}
                >
                  <div className="truncate text-[14px] font-medium">{it.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{it.entityType.toLowerCase()} · {it.submitter?.displayName ?? '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {!selectedId ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-[13px] text-muted">{t('selectSubmission')}</div>
          ) : detail.isLoading || !detail.data ? (
            <div className="flex min-h-[30vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
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

function ReviewDetail({ data, busy, onApprove, onReject }: {
  data: ModReviewDetail;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const t = useTranslations('moderation');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      {/* Context (read-only) */}
      {data.journey && (
        <div className="mb-4 rounded-xl bg-bg p-3 text-[13px]">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{t('context')}</div>
          <div className="text-muted">{t('submittedBy', { name: data.submitter?.displayName ?? '—' })}</div>
          <div className="mt-1">{data.journey.title}</div>
          <div className="mt-1 text-muted">{data.journey.sentence.textEn}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] text-accent">{data.journey.sentence.subvirtue.virtue.nameEn}</span>
            <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[11px] text-accent-2">{data.journey.sentence.subvirtue.nameEn}</span>
            {data.journey.weaknesses.map((w) => (
              <span key={w.id} className="rounded-full bg-muted/15 px-2 py-0.5 text-[11px] text-muted">{w.nameEn}</span>
            ))}
          </div>
        </div>
      )}

      {/* ERC content */}
      <div className="mb-4">
        <BilingualText en={data.item.titleEn} mr={data.item.titleMr} size="md" />
        {data.item.descriptionEn && <p className="mt-2 text-[14px] leading-relaxed text-muted">{data.item.descriptionEn}</p>}
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {data.ercType}
          {data.item.tier ? ` · ${data.item.tier.toLowerCase()}` : ''}
          {data.item.durationWeeks ? ` · ${data.item.durationWeeks}w` : ''}
          {data.item.durationDays ? ` · ${data.item.durationDays}d` : ''}
        </div>
      </div>

      {/* Actions */}
      {rejecting ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectReasonPlaceholder')}
            className="h-20 w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>{t('cancel')}</Button>
            <Button size="sm" disabled={busy || !reason.trim()} onClick={() => onReject(reason.trim())}>{t('confirmReject')}</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}><Check className="h-4 w-4" /><span className="ml-1.5">{t('approve')}</span></Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}><X className="h-4 w-4" /><span className="ml-1.5">{t('reject')}</span></Button>
        </div>
      )}
    </div>
  );
}
