'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useWeaknesses } from '@/hooks/use-weaknesses';
import { WhyModal } from '@/components/study/why-modal';

export default function StudyBrowserPage() {
  const t = useTranslations('study.browser');
  const tStudy = useTranslations('study');
  const { data, isLoading } = useWeaknesses();
  const clusters = data?.clusters ?? [];

  return (
    <div className="py-8">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
        {tStudy('nav')}
      </div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="mb-1 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
            {t('title')}
          </h1>
          <p className="text-[15px] text-muted">{t('subtitle')}</p>
        </div>
        <WhyModal />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-10">
          {clusters.map((cluster) => (
            <section key={cluster.key}>
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {cluster.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cluster.weaknesses.map((w, i) => (
                  <Link
                    key={w.id}
                    href={`/study/${w.id}`}
                    className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-bg"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-mono text-[11px] text-muted group-hover:text-accent">→</span>
                    </div>
                    <h3 className="mb-1 font-display text-[18px] tracking-tight">{w.nameEn}</h3>
                    {w.nameMr && (
                      <p className="mb-2 font-deva text-[14px] text-muted">{w.nameMr}</p>
                    )}
                    {w.description && (
                      <p className="mb-3 line-clamp-2 text-[13px] text-muted">{w.description}</p>
                    )}
                    {w.stats && (
                      <div className="flex items-center gap-4 border-t border-border pt-3">
                        <span className={`text-[12px] ${w.stats.testsTaken > 0 ? 'text-accent-2' : 'text-muted/50'}`}>
                          {w.stats.testsTaken > 0
                            ? `${w.stats.testsTaken} test${w.stats.testsTaken !== 1 ? 's' : ''} taken`
                            : 'Not explored yet'}
                        </span>
                        {w.stats.hasActiveJourney && (
                          <span className="text-[12px] text-accent">Journey active</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
