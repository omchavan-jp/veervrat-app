'use client';

import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { Compass } from 'lucide-react';
import { useJourneys } from '@/hooks/use-journeys';
import type { JourneyState } from '@/lib/api/journeys';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
import { PageTitle } from '@/components/ui/typography';

const STATE_COLORS: Record<JourneyState, string> = {
  NOT_STARTED: 'bg-muted/20 text-muted',
  ACTIVE: 'bg-accent-2/15 text-accent-2',
  PAUSED: 'bg-warning/15 text-warning',
  DORMANT: 'bg-muted/15 text-muted',
  COMPLETED: 'bg-success/15 text-success',
};

export default function JourneysPage() {
  const t = useTranslations('journey');
  const format = useFormatter();
  const { data, isLoading, isError } = useJourneys();

  if (isLoading) {
    return (
      <div className="py-8">
        <PageTitle className="mb-6">{t('list.title')}</PageTitle>
        <SkeletonList count={4} />
      </div>
    );
  }

  const journeys = data?.items ?? [];

  return (
    <div className="py-8">
      <PageTitle className="mb-6">{t('list.title')}</PageTitle>

      {isError ? (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{t('list.loadError')}</AlertDescription>
        </Alert>
      ) : journeys.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={t('list.emptyState')}
          action={
            <Button nativeButton={false} render={<Link href="/study" />}>
              {t('list.emptyStateCta')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {journeys.map((journey) => (
            <Link
              key={journey.id}
              href={`/journeys/${journey.id}`}
              className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-bg"
            >
              {/* The title auto-defaults to the English sentence; only show it as a
                  separate heading when the user has given the journey a custom name,
                  otherwise the bilingual sentence below would duplicate it. */}
              {(() => {
                const hasCustomTitle = journey.title.trim() !== journey.sentence.textEn.trim();
                return (
                  <>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      {hasCustomTitle ? (
                        <h2 className="font-display text-[18px] tracking-tight">{journey.title}</h2>
                      ) : (
                        <BilingualText
                          en={journey.sentence.textEn}
                          mr={journey.sentence.textMr}
                          size="md"
                          as="div"
                          className="line-clamp-2 flex-1"
                        />
                      )}
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-[12px] font-medium ${STATE_COLORS[journey.state]}`}>
                        {t(`stateBadge.${journey.state.toLowerCase()}`)}
                      </span>
                    </div>
                    {hasCustomTitle && (
                      <BilingualText
                        en={journey.sentence.textEn}
                        mr={journey.sentence.textMr}
                        size="sm"
                        as="p"
                        className="mb-2 line-clamp-2"
                      />
                    )}
                  </>
                );
              })()}
              <div className="flex flex-wrap gap-1.5">
                {journey.weaknesses.map((w) => (
                  <ContentText
                    key={w.weakness.nameEn}
                    en={w.weakness.nameEn}
                    mr={w.weakness.nameMr}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                  />
                ))}
              </div>
              <p className="mt-3 text-[12px] text-muted/60">
                {format.dateTime(new Date(journey.updatedAt), { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
