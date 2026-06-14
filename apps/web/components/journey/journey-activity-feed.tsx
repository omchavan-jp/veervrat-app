'use client';

import { useTranslations } from 'next-intl';
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

function relativeTime(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ActivityRow({ event }: { event: JourneyActivityEvent }) {
  const t = useTranslations('journey.activity');
  const Icon = ICON[event.type];
  // The item title is bilingual content — prefer Devanagari, fall back to English.
  const title = event.titleMr ?? event.titleEn;
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
              <span className={`font-medium ${event.titleMr ? 'font-deva' : ''}`}>{chunks}</span>
            ),
          })}
        </p>
        <span className="font-mono text-[11px] text-muted">{relativeTime(event.at, Date.now())}</span>
      </div>
    </li>
  );
}

export function JourneyActivityFeed({ journeyId }: { journeyId: string }) {
  const t = useTranslations('journey.activity');
  const { data: events, isLoading } = useJourneyActivity(journeyId);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{t('title')}</h3>
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
            <ActivityRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
