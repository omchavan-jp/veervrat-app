'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLogCheckin } from '@/hooks/use-journeys';
import type { CheckinStatus } from '@/lib/api/journeys';

type Props = {
  journeyId: string;
  resolutionId: string;
};

const STATUSES: { value: CheckinStatus; labelKey: 'done' | 'partial' | 'missed' }[] = [
  { value: 'DONE', labelKey: 'done' },
  { value: 'PARTIAL', labelKey: 'partial' },
  { value: 'MISSED', labelKey: 'missed' },
];

const STATUS_STYLES: Record<CheckinStatus, { active: string; idle: string }> = {
  DONE: {
    active: 'bg-success/10 text-success border-success/40',
    idle: 'border-border text-muted hover:bg-bg',
  },
  PARTIAL: {
    active: 'bg-warning/10 text-warning border-warning/40',
    idle: 'border-border text-muted hover:bg-bg',
  },
  MISSED: {
    active: 'bg-accent/10 text-accent border-accent/40',
    idle: 'border-border text-muted hover:bg-bg',
  },
};

export function CheckinForm({ journeyId, resolutionId }: Props) {
  const t = useTranslations('journey.checkin');
  const [selected, setSelected] = useState<CheckinStatus | null>(null);
  const [note, setNote] = useState('');
  const logCheckin = useLogCheckin(journeyId, resolutionId);

  function handleSubmit() {
    if (!selected || logCheckin.isPending) return;
    const trimmedNote = note.trim();
    if (note.length > 0 && trimmedNote.length === 0) {
      setNote('');
      return;
    }
    logCheckin.mutate(
      { status: selected, note: trimmedNote || undefined },
      {
        onSuccess: () => {
          setSelected(null);
          setNote('');
        },
      },
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border p-3">
      <p className="mb-2 text-[12px] font-medium text-muted">{t('logTitle')}</p>
      <div className="flex gap-2">
        {STATUSES.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSelected(value)}
            disabled={logCheckin.isPending}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
              selected === value ? STATUS_STYLES[value].active : STATUS_STYLES[value].idle
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t('notePlaceholder')}
            disabled={logCheckin.isPending}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-[13px] placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={logCheckin.isPending}
            className="mt-1 rounded-lg bg-accent-2/10 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/20 disabled:opacity-40"
          >
            {logCheckin.isPending ? t('logging') : t('log')}
          </button>
        </div>
      )}
    </div>
  );
}
