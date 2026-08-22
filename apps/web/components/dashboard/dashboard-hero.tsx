'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Compass, Search, PenLine } from 'lucide-react';
import { useJourneys } from '@/hooks/use-journeys';
import type { JourneySummary } from '@/lib/api/journeys';
import { Button, buttonVariants } from '@/components/ui/button';
import { BilingualText } from '@/components/shared/bilingual-text';
import { SectionLabel } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

// Zone C — "Act now". The single dominant, raised region on the dashboard (15a §4:
// ≤1 hero surface). It answers the daily loop, not the menu:
//   - active journey  → continue it (the real recurring habit)
//   - no active journey → Study first (you discover a weakness before working it)
// Secondary actions sit visibly smaller beneath, never co-equal (the old twin-giant
// PATH 01/02 problem). See app/(app)/dashboard/IA.md.
export function DashboardHero() {
  const t = useTranslations('dashboard.hero');
  const { data, isLoading } = useJourneys();

  if (isLoading) {
    return <div className="mb-10 h-44 animate-pulse rounded-2xl bg-border/60" />;
  }

  const journeys = data?.items ?? [];
  // Most-recently-touched active journey is the thing to resume.
  const active = journeys
    .filter((j) => j.state === 'ACTIVE' || j.state === 'NOT_STARTED')
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];

  return active ? <ContinueHero journey={active} /> : <StudyHero />;
}

function HeroShell({ children }: { children: React.ReactNode }) {
  // The one raised surface on the page: bg-surface + shadow-card, generous padding.
  return (
    <section className="mb-10 rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      {children}
    </section>
  );
}

function ContinueHero({ journey }: { journey: JourneySummary }) {
  const t = useTranslations('dashboard.hero');
  return (
    <HeroShell>
      <SectionLabel className="mb-3 text-accent">{t('continueEyebrow')}</SectionLabel>
      <BilingualText
        en={journey.sentence.textEn}
        mr={journey.sentence.textMr}
        size="lg"
        as="h2"
        className="mb-5 max-w-2xl"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={`/journeys/${journey.id}`} />}
          className="min-h-12 gap-2 px-6 text-[15px]"
        >
          {t('continueCta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <SecondaryActions />
      </div>
    </HeroShell>
  );
}

function StudyHero() {
  const t = useTranslations('dashboard.hero');
  return (
    <HeroShell>
      <SectionLabel className="mb-3 text-accent">{t('startEyebrow')}</SectionLabel>
      <h2 className="mb-2 max-w-2xl font-display text-[clamp(20px,2.4vw,26px)] font-normal leading-snug tracking-tight">
        {t('startTitle')}
      </h2>
      <p className="mb-5 max-w-xl text-[14px] leading-relaxed text-muted">{t('startSubtitle')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/study" />}
          className="min-h-12 gap-2 px-6 text-[15px]"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {t('startCta')}
        </Button>
        <Link
          href="/experiences/new"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'gap-1.5 text-[13px] text-muted hover:text-fg',
          )}
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
          {t('logExperience')}
        </Link>
      </div>
    </HeroShell>
  );
}

// Secondary navigation under the hero CTA — deliberately smaller/quieter than the
// primary so the two never read as co-equal (15a density + hierarchy).
function SecondaryActions() {
  const t = useTranslations('dashboard.hero');
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        href="/journeys"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'gap-1.5 text-[13px] text-muted hover:text-fg',
        )}
      >
        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
        {t('allJourneys')}
      </Link>
      <Link
        href="/study"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'gap-1.5 text-[13px] text-muted hover:text-fg',
        )}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        {t('study')}
      </Link>
      <Link
        href="/experiences/new"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'gap-1.5 text-[13px] text-muted hover:text-fg',
        )}
      >
        <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
        {t('logExperience')}
      </Link>
    </div>
  );
}
