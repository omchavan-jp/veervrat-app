'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useJourneys } from '@/hooks/use-journeys';
import type { JourneyState } from '@/lib/api/journeys';

const STATE_COLORS: Record<JourneyState, string> = {
  NOT_STARTED: 'bg-muted/20 text-muted',
  ACTIVE: 'bg-accent-2/15 text-accent-2',
  PAUSED: 'bg-warning/15 text-warning',
  DORMANT: 'bg-muted/15 text-muted',
  COMPLETED: 'bg-success/15 text-success',
};

export default function JourneysPage() {
  const t = useTranslations('journey');
  const { data, isLoading } = useJourneys();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const journeys = data?.items ?? [];

  return (
    <div className="py-8">
      <h1 className="mb-6 font-display text-[clamp(28px,3vw,40px)] leading-tight tracking-tight">
        {t('list.title')}
      </h1>

      {journeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="mb-4 text-[15px] text-muted">{t('list.emptyState')}</p>
          <Link
            href="/study"
            className="inline-flex h-auto items-center justify-center rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
          >
            {t('list.emptyStateCta')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((journey) => (
            <Link
              key={journey.id}
              href={`/journeys/${journey.id}`}
              className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-bg"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="font-display text-[18px] tracking-tight">{journey.title}</h2>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-[12px] font-medium ${STATE_COLORS[journey.state]}`}>
                  {t(`stateBadge.${journey.state.toLowerCase()}`)}
                </span>
              </div>
              <p className={`mb-2 line-clamp-1 text-[13px] text-muted ${journey.sentence.textMr ? 'font-deva' : ''}`}>
                {journey.sentence.textMr ?? journey.sentence.textEn}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {journey.weaknesses.map((w, i) => (
                  <span
                    key={i}
                    className={`rounded-full border border-border px-2 py-0.5 text-[11px] text-muted ${w.weakness.nameMr ? 'font-deva' : ''}`}
                  >
                    {w.weakness.nameMr ?? w.weakness.nameEn}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-muted/60">
                {new Date(journey.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
