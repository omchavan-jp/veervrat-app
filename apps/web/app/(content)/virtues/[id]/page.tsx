'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkles } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export default function VirtueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('virtues');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.virtues.virtue(id),
    queryFn: () => virtuesApi.getVirtue(id),
  });

  if (isLoading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (isError || !data) {
    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title={t('notFound')}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Breadcrumbs
        label={t('breadcrumbLabel')}
        crumbs={[{ href: '/virtues', en: t('breadcrumbRoot') }]}
        current={{ en: data.nameEn, mr: data.nameMr }}
      />
      <div className="mt-3">
        <BilingualText en={data.nameEn} mr={data.nameMr} size="xl" />
      </div>
      {data.description && (
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{data.description}</p>
      )}

      <h2 className="mb-3 mt-8 text-[16px] font-medium">{t('subvirtues')}</h2>
      {data.subvirtues.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title={t('noSubvirtues')} />
      ) : (
        <div className="space-y-2.5">
          {data.subvirtues.map((s) => (
            <Link
              key={s.id}
              href={`/subvirtues/${s.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
            >
              <div className="min-w-0 flex-1">
                <BilingualText en={s.nameEn} mr={s.nameMr} size="sm" />
                {s.description && <p className="mt-1 text-[12px] text-muted">{s.description}</p>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
