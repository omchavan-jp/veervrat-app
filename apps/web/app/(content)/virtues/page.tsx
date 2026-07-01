'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Search } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { weaknessesApi } from '@/lib/api/weaknesses';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';

function excerpt(s: string | null, max = 120): string {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default function VirtuesBrowserPage() {
  const t = useTranslations('virtues');

  const virtues = useQuery({ queryKey: queryKeys.virtues.list, queryFn: () => virtuesApi.list() });
  const weaknesses = useQuery({ queryKey: queryKeys.weaknesses.all, queryFn: () => weaknessesApi.list() });

  const allWeaknesses = useMemo(
    () => (weaknesses.data?.clusters ?? []).flatMap((c) => c.weaknesses),
    [weaknesses.data],
  );

  return (
    <div>
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('subtitle')}</p>

      {/* Virtues (primary) */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-[16px] font-medium">{t('virtuesSection')}</h2>
        </div>
        {virtues.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><Spinner size="lg" /></div>
        ) : virtues.isError ? (
          <p className="text-[13px] text-danger">{t('loadError')}</p>
        ) : (virtues.data ?? []).length === 0 ? (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title={t('virtuesEmpty')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(virtues.data ?? []).map((v) => (
              <Link key={v.id} href={`/virtues/${v.id}`} className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30">
                <BilingualText en={v.nameEn} mr={v.nameMr} size="md" />
                {v.description && <p className="mt-2 text-[13px] text-muted">{excerpt(v.description)}</p>}
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{t('subvirtueCount', { count: v.subvirtueCount })}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Weaknesses (secondary) */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted" />
          <h2 className="text-[16px] font-medium">{t('weaknessesSection')}</h2>
        </div>
        {weaknesses.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><Spinner size="lg" /></div>
        ) : weaknesses.isError ? (
          <p className="text-[13px] text-danger">{t('loadError')}</p>
        ) : allWeaknesses.length === 0 ? (
          <EmptyState icon={<Search className="h-5 w-5" />} title={t('weaknessesEmpty')} />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {allWeaknesses.map((w) => (
              <Link key={w.id} href={`/weaknesses/${w.id}`} className="rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/30">
                <BilingualText en={w.nameEn} mr={w.nameMr} size="sm" />
                {w.description && <p className="mt-1 text-[12px] text-muted">{excerpt(w.description, 90)}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
