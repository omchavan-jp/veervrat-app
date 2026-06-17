'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ScrollText } from 'lucide-react';
import { contentApi, type Shloka } from '@/lib/api/content';
import { queryKeys } from '@/lib/api/query-keys';
import { BilingualText } from '@/components/shared/bilingual-text';
import { EmptyState } from '@/components/ui/empty-state';

function ShlokaBlock({ s }: { s: Shloka }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="font-deva text-[18px] leading-relaxed">{s.devanagariText}</div>
      {s.transliteration && <div className="mt-1 text-[12px] italic text-muted">{s.transliteration}</div>}
      {s.meaningEn && <div className="mt-2 text-[14px] text-muted">{s.meaningEn}</div>}
      {s.sourceCitation && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{s.sourceCitation}</div>}
    </div>
  );
}

export default function PothiPage() {
  const t = useTranslations('content');
  const { data, isLoading, isError } = useQuery({ queryKey: queryKeys.content.pothi, queryFn: () => contentApi.pothiSections() });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('pothiTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('pothiSubtitle')}</p>
        </div>
        <div className="flex gap-3 text-[13px]">
          <Link href="/shlokas" className="text-accent hover:underline">{t('seeMoreShlokas')}</Link>
          <Link href="/resources" className="text-accent hover:underline">{t('resources')}</Link>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : isError ? (
          <p className="text-[13px] text-danger">{t('loadError')}</p>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState icon={<ScrollText className="h-5 w-5" />} title={t('pothiEmpty')} description={t('pothiEmptyHint')} />
        ) : (
          <div className="space-y-6">
            {data!.map((section) => (
              <section key={section.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t('section', { n: section.sectionNumber })}</div>
                <BilingualText en={section.titleEn} mr={section.titleMr} size="lg" />
                {section.introText && <p className="mt-3 text-[14px] leading-relaxed text-muted">{section.introText}</p>}
                {section.shlokas.length > 0 && (
                  <div className="mt-4 space-y-3">{section.shlokas.map((s) => <ShlokaBlock key={s.id} s={s} />)}</div>
                )}
                {section.congregationResponse && <p className="mt-3 text-[13px] italic text-muted">{section.congregationResponse}</p>}
                {section.postShlokaCommentary && <p className="mt-3 text-[14px] leading-relaxed">{section.postShlokaCommentary}</p>}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
