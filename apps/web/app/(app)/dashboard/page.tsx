import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { DashboardStatsBar } from '@/components/dashboard/dashboard-stats-bar';
import { DashboardSuggestions } from '@/components/dashboard/dashboard-suggestions';
import { DashboardPlatformStats } from '@/components/dashboard/dashboard-platform-stats';
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="py-8">
      {/* Header row */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[12px] text-muted">{t('sakaPlaceholder')} · {today}</div>
          <DashboardGreeting />
        </div>
        <button
          disabled
          className="shrink-0 rounded-full border border-border px-4 py-2 text-[13px] text-muted opacity-50 cursor-not-allowed"
        >
          {t('logExperience')}
        </button>
      </div>

      {/* Stats bar */}
      <DashboardStatsBar />

      {/* Main grid: left content + right sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          {/* Path cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Path card 01 — Study */}
            <Link
              href="/study"
              className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent transition-colors"
            >
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Path 01 · Study</div>
              <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('pathCard01Title')}</h2>
              <p className="text-[13px] text-muted">{t('pathCard01Subtitle')}</p>
            </Link>

            {/* Path card 02 — Work */}
            <Link
              href="/journeys"
              className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent transition-colors"
            >
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Path 02 · Work</div>
              <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('pathCard02Title')}</h2>
              <p className="text-[13px] text-muted">{t('pathCard02Subtitle')}</p>
            </Link>
          </div>

          {/* Sentence suggestions */}
          <DashboardSuggestions />
        </div>

        {/* Right sidebar */}
        <aside className="space-y-6">
          {/* Shloka placeholder */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Shloka of the day</div>
            <p className="text-[13px] text-muted">{t('shlokaPlaceholder')}</p>
          </div>

          {/* Platform stats */}
          <DashboardPlatformStats />
        </aside>
      </div>
    </div>
  );
}
