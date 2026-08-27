'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useFormatter } from 'next-intl';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { contentSuggestionsApi, type ContentSuggestion } from '@/lib/api/content-suggestions';
import { docToText } from '@/lib/suggestions/body';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PageTitle } from '@/components/ui/typography';
import { StatusPill } from '@/components/shared/suggestions/status-pill';

export function MySuggestionsClient() {
  const t = useTranslations('suggestions');
  const tCommon = useTranslations('common');
  const format = useFormatter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['content-suggestions', 'mine', 'all'],
    queryFn: () => contentSuggestionsApi.mine(),
  });

  const items = data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageTitle>{t('mineTitle')}</PageTitle>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label={tCommon('loading')} />
        </div>
      )}

      {error && !isLoading && (
        <p className="py-12 text-center text-sm text-danger">{tCommon('error_loading')}</p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<MessageSquareText className="h-5 w-5" />}
          title={t('mineEmpty')}
          description={t('mineEmptyHint')}
        />
      )}

      {items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((s: ContentSuggestion) => (
            <li key={s.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[17px] leading-snug tracking-tight">
                    {s.titleEn}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {t(`kind.${s.kind}`)} · {t('on', { route: s.route })}
                  </p>
                </div>
                <StatusPill status={s.status} />
              </div>

              {docToText(s.bodyEn) && (
                <p className="mt-3 whitespace-pre-wrap text-[14px] text-muted">
                  {docToText(s.bodyEn)}
                </p>
              )}

              {/* The reason a suggestion was declined belongs to its author. Showing it here is
                  the difference between a decision and a silent rejection. */}
              {s.resolution && (
                <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-[13px]">
                  {s.resolution}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                <span>{format.dateTime(new Date(s.createdAt), { dateStyle: 'medium' })}</span>
                <Link href={s.url} className="underline underline-offset-2 hover:text-accent">
                  {t('on', { route: s.route })}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
