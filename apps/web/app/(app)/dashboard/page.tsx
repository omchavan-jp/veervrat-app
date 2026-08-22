import { getTranslations, getLocale } from 'next-intl/server';
import { DashboardStatsBar } from '@/components/dashboard/dashboard-stats-bar';
import { DashboardSuggestions } from '@/components/dashboard/dashboard-suggestions';
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { DashboardPlatformStats } from '@/components/dashboard/dashboard-platform-stats';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const isMr = locale === 'mr';
  const now = new Date();
  const today = now.toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // Saka (Rashtriya Saur / Indian National) calendar. Intl computes the `indian`
  // calendar parts natively (no hand-rolled conversion); the "Saur"/"Saka" wrapper
  // labels are translated, so we assemble from parts via the `sakaDate` template.
  // EN keeps Latin numerals; MR uses Devanagari (nu-deva) per spec/20.
  const sakaParts = new Intl.DateTimeFormat(
    isMr ? 'mr-IN-u-ca-indian-nu-deva' : 'en-IN-u-ca-indian',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  ).formatToParts(now);
  const sakaPart = (type: Intl.DateTimeFormatPartTypes) =>
    sakaParts.find((p) => p.type === type)?.value ?? '';
  const sakaDate = t('sakaDate', {
    weekday: sakaPart('weekday'),
    month: sakaPart('month'),
    day: sakaPart('day'),
    year: sakaPart('year'),
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Zone A — Header · compact chrome */}
      <header className="mb-6">
        <div className="mb-1 text-[12px] text-muted">
          {sakaDate} · {today}
        </div>
        <DashboardGreeting />
      </header>

      {/* Zone B — Status · one dense personal-counts row */}
      <DashboardStatsBar />

      {/* Zone C — Act now · the one dominant raised region */}
      <DashboardHero />

      {/* Zone D — Suggestions · low-density scannable list */}
      <DashboardSuggestions />

      {/* Zone E — Platform stats · quiet demoted bottom strip */}
      <DashboardPlatformStats />
    </div>
  );
}
