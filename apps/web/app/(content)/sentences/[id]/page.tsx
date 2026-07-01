'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function SentenceInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('virtues');
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.virtues.sentence(id),
    queryFn: () => virtuesApi.getSentence(id),
  });

  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (isError || !data) return <div className="text-muted">{t('notFound')}</div>;

  return (
    <div>
      <Link href={`/subvirtues/${data.subvirtue.id}`} className="text-[13px] text-muted hover:text-accent">
        ← <ContentText en={data.subvirtue.nameEn} mr={data.subvirtue.nameMr} />
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <BilingualText en={data.textEn} mr={data.textMr} size="lg" />
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          <ContentText
            en={data.subvirtue.virtue.nameEn}
            mr={data.subvirtue.virtue.nameMr}
            className="rounded-full bg-accent/12 px-2.5 py-1 text-accent"
          />
          <ContentText
            en={data.subvirtue.nameEn}
            mr={data.subvirtue.nameMr}
            className="rounded-full bg-accent-2/15 px-2.5 py-1 text-accent-2"
          />
        </div>
        {data.hasActiveJourney && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-success">
            <CheckCircle2 className="h-4 w-4" /> {t('activeJourney')}
          </div>
        )}
      </div>

      {/* CTAs — informational only; journeys start from the test flow, never here. */}
      <div className="mt-5">
        <p className="mb-3 text-[13px] text-muted">{t('sentenceCtaHint')}</p>
        {isAuthenticated ? (
          <Link href="/study"><Button size="sm">{t('takeTest')}</Button></Link>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong p-4 text-center text-[13px] text-muted">
            {t('loginToTest')} <Link href="/login" className="text-accent">{t('login')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
