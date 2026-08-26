'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { Users } from 'lucide-react';
import { vmRelationshipsApi, type MyVratarthi } from '@/lib/api/vm-relationships';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { PageTitle, SectionLabel } from '@/components/ui/typography';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function VratarthiCard({ va }: { va: MyVratarthi }) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/40">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {va.avatarUrl && <AvatarImage src={va.avatarUrl} />}
          <AvatarFallback>{initialsOf(va.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${va.username}`}
            className="block truncate font-display text-[18px] leading-tight tracking-tight hover:text-accent"
          >
            {va.displayName}
          </Link>
          <p className="truncate text-[13px] text-muted">@{va.username}</p>
        </div>
        <Badge
          variant="secondary"
          className={`shrink-0 border-transparent px-2.5 py-1 text-[11px] font-medium ${
            va.scope === 'GLOBAL' ? 'bg-accent/12 text-accent' : 'bg-accent-2/15 text-accent-2'
          }`}
        >
          {va.scope === 'GLOBAL'
            ? t('my_vratarthis.global_scope')
            : t('my_vratarthis.journey_scope')}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        <span>{t('my_vratarthis.journey_count', { count: va.journeyCount })}</span>
        {va.since && (
          <span>
            {t('my_vratarthis.since', {
              date: format.dateTime(new Date(va.since), { year: 'numeric', month: 'short' }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export function MyVratarthisClient() {
  const t = useTranslations();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-vratarthis'],
    queryFn: () => vmRelationshipsApi.getMyVratarthis(),
    staleTime: 30000,
  });

  const vratarthis = data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6">
        <SectionLabel className="mb-1 text-accent">{t('common.nav.groupVratmitra')}</SectionLabel>
        <PageTitle>{t('my_vratarthis.title')}</PageTitle>
        <p className="mt-1 text-[14px] text-muted">{t('my_vratarthis.subtitle')}</p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" label={t('common.loading')} />
        </div>
      )}

      {error && !isLoading && (
        <p className="py-12 text-center text-sm text-danger">{t('common.error_loading')}</p>
      )}

      {!isLoading && !error && vratarthis.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={t('my_vratarthis.empty')}
          description={t('my_vratarthis.empty_hint')}
        />
      )}

      {!isLoading && vratarthis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vratarthis.map((va) => (
            <VratarthiCard key={va.relationshipId} va={va} />
          ))}
        </div>
      )}
    </div>
  );
}
