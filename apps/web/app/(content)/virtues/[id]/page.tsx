'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';

export default function VirtueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('virtues');
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.virtues.virtue(id),
    queryFn: () => virtuesApi.getVirtue(id),
  });

  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (isError || !data) return <div className="text-muted">{t('notFound')}</div>;

  return (
    <div>
      <Link href="/virtues" className="text-[13px] text-muted hover:text-accent">← {t('backToBrowser')}</Link>
      <div className="mt-3">
        <BilingualText en={data.nameEn} mr={data.nameMr} size="xl" />
      </div>
      {data.description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{data.description}</p>}

      <h2 className="mb-3 mt-8 text-[16px] font-medium">{t('subvirtues')}</h2>
      <div className="space-y-2.5">
        {data.subvirtues.map((s) => (
          <Link key={s.id} href={`/subvirtues/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30">
            <div className="min-w-0 flex-1">
              <BilingualText en={s.nameEn} mr={s.nameMr} size="sm" />
              {s.description && <p className="mt-1 text-[12px] text-muted">{s.description}</p>}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
