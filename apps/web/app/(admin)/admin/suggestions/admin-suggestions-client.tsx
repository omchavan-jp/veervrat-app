'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useFormatter } from 'next-intl';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import {
  contentSuggestionsApi,
  type ContentSuggestion,
  type SuggestionStatus,
} from '@/lib/api/content-suggestions';
import { docToText } from '@/lib/suggestions/body';
import { errorMessage } from '@/lib/api/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PageTitle } from '@/components/ui/typography';
import { useToast } from '@/components/ui/toast';
import { StatusPill } from '@/components/shared/suggestions/status-pill';

const STATUSES: SuggestionStatus[] = ['NEW', 'TRIAGED', 'ACCEPTED', 'DECLINED', 'SHIPPED'];

/**
 * Triage ends in a conversion, not a status.
 *
 * A board whose only outcomes are "done" and "declined" turns gathering into a pile: it spends
 * the author's attention and returns nothing. So accepting asks *what it became* — a CMS key or
 * an issue — and declining asks for a reason the author can read.
 */
function TriageRow({ s }: { s: ContentSuggestion }) {
  const t = useTranslations('suggestions');
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState(s.resolution ?? '');
  const [cmsKey, setCmsKey] = useState(s.linkedCmsKey ?? '');
  const [issue, setIssue] = useState(s.linkedIssue ?? '');

  const triage = useMutation({
    mutationFn: (status: SuggestionStatus) =>
      contentSuggestionsApi.triage(s.id, {
        status,
        resolution: resolution || undefined,
        linkedCmsKey: cmsKey || undefined,
        linkedIssue: issue || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-suggestions', 'admin'] });
      setOpen(false);
    },
    onError: (err) => toast.add({ title: errorMessage(err, t('saveError')), type: 'error' }),
  });

  return (
    <li className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[17px] leading-snug tracking-tight">{s.titleEn}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {t(`kind.${s.kind}`)} · {t('on', { route: s.route })}
            {s.author ? ` · ${t('by', { name: s.author.displayName })}` : ''}
          </p>
        </div>
        <StatusPill status={s.status} />
      </div>

      {/* Where on the page it was placed — the anchor, in the order it should be trusted. */}
      <p className="mt-2 truncate font-mono text-[11px] text-muted">
        {s.anchorKey ?? s.anchorText ?? s.anchorPath ?? '—'}
      </p>

      {s.currentText && (
        <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-[13px] text-muted">
          {s.currentText}
        </p>
      )}
      {docToText(s.bodyEn) && (
        <p className="mt-3 whitespace-pre-wrap text-[14px]">{docToText(s.bodyEn)}</p>
      )}
      {docToText(s.bodyMr) && (
        <p className="mt-2 whitespace-pre-wrap text-[14px]">{docToText(s.bodyMr)}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={s.url} className="text-[12px] underline underline-offset-2 hover:text-accent">
          {t('on', { route: s.route })}
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto rounded-full"
          onClick={() => setOpen((v) => !v)}
        >
          {t('triage')}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Input
            value={cmsKey}
            onChange={(e) => setCmsKey(e.target.value)}
            placeholder={t('cmsKeyPlaceholder')}
          />
          <Input
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder={t('issuePlaceholder')}
          />
          <Input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={t('resolutionPlaceholder')}
          />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === s.status ? 'default' : 'outline'}
                className="rounded-full"
                disabled={triage.isPending}
                onClick={() => triage.mutate(status)}
              >
                {t(`status.${status}`)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export function AdminSuggestionsClient() {
  const t = useTranslations('suggestions');
  const tCommon = useTranslations('common');
  const [status, setStatus] = useState<SuggestionStatus | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['content-suggestions', 'admin', status ?? 'all'],
    queryFn: () => contentSuggestionsApi.list(status ? { status } : undefined),
  });

  const items = data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageTitle>{t('adminTitle')}</PageTitle>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={status === undefined ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => setStatus(undefined)}
        >
          {t('allStatuses')}
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setStatus(s)}
          >
            {t(`status.${s}`)}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label={tCommon('loading')} />
        </div>
      )}
      {error && !isLoading && (
        <p className="py-12 text-center text-sm text-danger">{tCommon('error_loading')}</p>
      )}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState icon={<MessageSquareText className="h-5 w-5" />} title={t('adminEmpty')} />
      )}

      {items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((s) => (
            <TriageRow key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
