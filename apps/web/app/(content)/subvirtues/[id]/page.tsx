'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';

export default function SubvirtueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('virtues');
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.virtues.subvirtue(id),
    queryFn: () => virtuesApi.getSubvirtue(id),
  });

  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (isError || !data) return <div className="text-muted">{t('notFound')}</div>;

  return (
    <div>
      <Link href={`/virtues/${data.virtue.id}`} className="text-[13px] text-muted hover:text-accent">
        ← {data.virtue.nameMr ?? data.virtue.nameEn}
      </Link>
      <div className="mt-3">
        <BilingualText en={data.nameEn} mr={data.nameMr} size="xl" />
      </div>
      <div className="mt-1 text-[13px] text-muted">{t('partOf', { virtue: data.virtue.nameEn })}</div>
      {data.description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{data.description}</p>}

      {/* Weaknesses this subvirtue tackles */}
      {data.weaknesses.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[16px] font-medium">{t('tacklesWeaknesses')}</h2>
          <div className="flex flex-wrap gap-2">
            {data.weaknesses.map((w) => (
              <Link key={w.id} href={`/weaknesses/${w.id}`} className="rounded-full border border-border-strong px-3.5 py-1.5 text-[13px] transition-colors hover:border-accent">
                {w.nameMr ?? w.nameEn}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sentences */}
      {data.sentences.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[16px] font-medium">{t('sentences')}</h2>
          <div className="space-y-2.5">
            {data.sentences.map((s) => (
              <Link key={s.id} href={`/sentences/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30">
                <div className="min-w-0 flex-1"><BilingualText en={s.textEn} mr={s.textMr} size="sm" /></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
