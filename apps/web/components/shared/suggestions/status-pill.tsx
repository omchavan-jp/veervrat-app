'use client';

import { useTranslations } from 'next-intl';
import type { SuggestionStatus } from '@/lib/api/content-suggestions';

const TONE: Record<SuggestionStatus, string> = {
  NEW: 'bg-fg/8 text-muted',
  TRIAGED: 'bg-accent/12 text-accent',
  ACCEPTED: 'bg-success/12 text-success',
  DECLINED: 'bg-danger/12 text-danger',
  // Live is the strongest signal on the board — deliberately distinct from accepted, because
  // agreeing to something and it existing are different facts.
  SHIPPED: 'bg-success/20 text-success',
};

export function StatusPill({ status }: { status: SuggestionStatus }) {
  const t = useTranslations('suggestions');
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] ${TONE[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
