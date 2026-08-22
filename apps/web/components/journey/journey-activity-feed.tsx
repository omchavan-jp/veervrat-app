'use client';

import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { CheckCircle2, Send, Play, CalendarCheck, MessageSquareText } from 'lucide-react';
import { useJourneyActivity } from '@/hooks/use-journeys';
import type { JourneyActivityEvent, JourneyActivityEventType } from '@/lib/api/journeys';

const ICON: Record<JourneyActivityEventType, typeof CheckCircle2> = {
  erc_started: Play,
  erc_submitted: Send,
  erc_approved: CheckCircle2,
  checkin: CalendarCheck,
  vm_suggestion: MessageSquareText,
};

const MESSAGE_KEY: Record<JourneyActivityEventType, string> = {
  erc_started: 'ercStarted',
  erc_submitted: 'ercSubmitted',
  erc_approved: 'ercApproved',
  checkin: 'checkin',
  vm_suggestion: 'vmSuggestion',
};

function ActivityRow({ event, now }: { event: JourneyActivityEvent; now: Date }) {
  const t = useTranslations('journey.activity');
  const format = useFormatter();
  const locale = useLocale();
  const Icon = ICON[event.type];
  // The item title is bilingual content — follow the active locale, fall back to the
  // other script when the preferred one is missing.
  const useMr = locale === 'mr' && !!event.titleMr;
  const title = useMr ? (event.titleMr as string) : event.titleEn;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">
          {t.rich(MESSAGE_KEY[event.type], {
            title,
            b: (chunks) => (
              <span className={`font-medium ${useMr ? 'font-deva' : ''}`}>{chunks}</span>
            ),
          })}
        </p>
        <span className="font-mono text-[11px] text-muted">
          {format.relativeTime(new Date(event.at), now)}
        </span>
      </div>
    </li>
  );
}

export function JourneyActivityFeed({ journeyId }: { journeyId: string }) {
  const t = useTranslations('journey.activity');
  const { data: events, isLoading } = useJourneyActivity(journeyId);
  // Compute the reference time once per render so identical events render identical labels.
  const now = new Date();

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {t('title')}
      </h3>
      {isLoading ? (
        <div className="space-y-2 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-bg" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <p className="py-3 text-[13px] text-muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}
