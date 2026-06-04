'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useWeaknesses } from '@/hooks/use-weaknesses';

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('study.dashboard');
  const { data: weaknessData } = useWeaknesses();

  if (!user) return null;

  const allWeaknesses = (weaknessData?.clusters ?? []).flatMap((c) => c.weaknesses);
  const weaknessesExplored = allWeaknesses.filter((w) => w.stats && w.stats.testsTaken > 0).length;
  const testsTaken = allWeaknesses.reduce((sum, w) => sum + (w.stats?.testsTaken ?? 0), 0);

  return (
    <div className="py-8">
      <div className="mb-8">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">Dashboard</div>
        <h1 className="font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
          Namaskar{user.displayName ? `, ${user.displayName}` : ''}.
        </h1>
      </div>

      {/* Path card 01 */}
      <section className="mb-8">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Path 01</div>
              <h2 className="font-display text-[22px] tracking-tight">{t('pathCard01Title')}</h2>
              <p className="mt-1 text-[14px] text-muted">{t('pathCard01Subtitle')}</p>
            </div>
            <Link
              href="/study"
              className="shrink-0 rounded-full border border-border-strong px-4 py-2 text-[13px] text-muted hover:border-accent hover:text-fg"
            >
              {t('goStudy')}
            </Link>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="font-mono text-[24px] font-medium text-fg">{weaknessesExplored}</div>
              <div className="text-[12px] text-muted">{t('weaknessesExplored', { count: weaknessesExplored })}</div>
            </div>
            <div>
              <div className="font-mono text-[24px] font-medium text-fg">{testsTaken}</div>
              <div className="text-[12px] text-muted">{t('testsTaken', { count: testsTaken })}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sentence suggestions placeholder — will be populated once tests exist */}
      <section>
        <h2 className="mb-3 font-display text-[20px] tracking-tight">{t('suggestionsTitle')}</h2>
        <p className="mb-4 text-[14px] text-muted">{t('suggestionsSubtitle')}</p>
        {testsTaken === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-[14px] text-muted">{t('noSuggestions')}</p>
            <Link
              href="/study"
              className="mt-4 inline-flex h-auto items-center justify-center rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
            >
              Take your first test
            </Link>
          </div>
        ) : (
          <p className="text-[14px] text-muted">Suggestions will load here based on your latest test results.</p>
        )}
      </section>
    </div>
  );
}
