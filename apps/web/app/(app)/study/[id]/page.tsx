'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useWeakness } from '@/hooks/use-weaknesses';
import { WhyModal } from '@/components/study/why-modal';

export default function WeaknessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('study.detail');
  const { data: weakness, isLoading } = useWeakness(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!weakness) {
    return (
      <div className="py-8">
        <Link href="/study" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          ← Back to weaknesses
        </Link>
        <p className="text-muted">Weakness not found.</p>
      </div>
    );
  }

  const hasDraft = !!weakness.draftTestId;

  return (
    <div className="py-8">
      <Link href="/study" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        ← Back to weaknesses
      </Link>

      <div className="mb-8">
        {weakness.nameMr ? (
          <>
            <h1 className="mb-1 font-deva text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
              {weakness.nameMr}
            </h1>
            <p className="mb-3 text-[16px] text-muted">{weakness.nameEn}</p>
          </>
        ) : (
          <h1 className="mb-3 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
            {weakness.nameEn}
          </h1>
        )}
        {weakness.description && (
          <p className="text-[15px] leading-relaxed text-muted">{weakness.description}</p>
        )}
        <div className="mt-4">
          <WhyModal />
        </div>
      </div>

      {/* Subvirtues */}
      {weakness.subvirtues.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {t('subvirtuesTitle')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {weakness.subvirtues.map((sv: { id: string; nameEn: string; virtue: { nameEn: string } }) => (
              <span
                key={sv.id}
                className="rounded-full border border-accent-2/30 px-3 py-1 text-[13px] text-accent-2"
              >
                {sv.virtue.nameEn} → {sv.nameEn}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Test history */}
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {t('testHistoryTitle')}
        </h2>
        {weakness.testHistory.length === 0 ? (
          <p className="text-[14px] text-muted">{t('noTests')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakness.testHistory.map((test: { id: string; submittedAt: string }, i: number) => (
              <Link
                key={test.id}
                href={`/study/${id}/test/${test.id}/report`}
                className="rounded-full border border-border px-3 py-1 text-[13px] text-muted hover:border-accent hover:text-fg"
              >
                Test {i + 1} · {new Date(test.submittedAt).toLocaleDateString()}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <Link
        href={hasDraft ? `/study/${id}/test/${weakness.draftTestId}` : `/study/${id}/test`}
        className="inline-flex h-auto items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
      >
        {hasDraft ? t('resumeDraft') : t('takeTest')}
      </Link>
    </div>
  );
}
