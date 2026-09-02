'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { virtuesApi } from '@/lib/api/virtues';
import { weaknessesApi } from '@/lib/api/weaknesses';
import { queryKeys } from '@/lib/api/query-keys';
import { BackLink } from '@/components/shared/breadcrumbs';
import { useAuth } from '@/hooks/use-auth';
import { BilingualText } from '@/components/shared/bilingual-text';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function WeaknessBrowseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('virtues');
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.weaknesses.detail(id),
    queryFn: () => weaknessesApi.detail(id),
  });

  if (isLoading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (isError || !data) return <div className="text-muted">{t('notFound')}</div>;

  return (
    <div>
      {/* No breadcrumb, deliberately. A weakness maps to MANY subvirtues (WeaknessSubvirtue is a
          join table), so it has no single parent and any ancestry shown here would be a claim the
          data does not support. Its subvirtues are listed in the body below, which is the honest
          answer. `BackLink` keeps the affordance identical to the breadcrumbed pages even though
          the hierarchy is not. See openspec/changes/navigation-reachability/design.md decision 1. */}
      <BackLink href="/virtues" label={t('backToBrowser')} />
      <div className="mt-3">
        <BilingualText en={data.nameEn} mr={data.nameMr} size="xl" />
      </div>
      {data.description && (
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{data.description}</p>
      )}

      {data.subvirtues.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-[16px] font-medium">{t('cultivateToTackle')}</h2>
          <p className="mb-3 text-[13px] text-muted">{t('cultivateHint')}</p>
          <div className="flex flex-wrap gap-2">
            {data.subvirtues.map((s) => (
              <Link
                key={s.id}
                href={`/subvirtues/${s.id}`}
                className="rounded-full border border-border-strong px-3.5 py-1.5 transition-colors hover:border-accent"
              >
                <BilingualText en={s.nameEn} mr={s.nameMr} size="sm" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        {isAuthenticated ? (
          <Link href={`/study/${data.id}`}>
            <Button size="sm">{t('takeTestForWeakness')}</Button>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong p-4 text-center text-[13px] text-muted">
            {t('loginToTest')}{' '}
            <Link href="/login" className="text-accent">
              {t('login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
