import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { DashboardStatsBar } from '@/components/dashboard/dashboard-stats-bar';
import { DashboardSuggestions } from '@/components/dashboard/dashboard-suggestions';
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const today = new Date().toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[12px] text-muted">{t('sakaPlaceholder')} · {today}</div>
          <DashboardGreeting />
        </div>
        <Link
          href="/experiences/new"
          className="shrink-0 rounded-full border border-border px-4 py-2 text-[13px] text-fg transition-colors hover:border-accent hover:bg-accent hover:text-bg"
        >
          {t('logExperience')}
        </Link>
      </div>

      {/* Stats bar */}
      <DashboardStatsBar />

      {/* Path cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Path card 01 — Study */}
        <Link
          href="/study"
          className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent transition-colors"
        >
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">{t('pathCard01Eyebrow')}</div>
          <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('pathCard01Title')}</h2>
          <p className="text-[13px] text-muted">{t('pathCard01Subtitle')}</p>
        </Link>

        {/* Path card 02 — Work */}
        <Link
          href="/journeys"
          className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent transition-colors"
        >
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">{t('pathCard02Eyebrow')}</div>
          <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('pathCard02Title')}</h2>
          <p className="text-[13px] text-muted">{t('pathCard02Subtitle')}</p>
        </Link>
      </div>

      {/* Sentence suggestions */}
      <DashboardSuggestions />
    </div>
  );
}
