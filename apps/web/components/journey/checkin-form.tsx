'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const noteId = useId();
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
        onError: (e) =>
          toast({
            title: t('logError'),
            description: e instanceof Error ? e.message : undefined,
            variant: 'destructive',
          }),
      },
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border p-3">
      <p className="mb-2 text-[12px] font-medium text-muted">{t('logTitle')}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={t('logTitle')}>
        {STATUSES.map(({ value, labelKey }) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            role="radio"
            aria-checked={selected === value}
            onClick={() => setSelected(value)}
            disabled={logCheckin.isPending}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
              selected === value ? STATUS_STYLES[value].active : STATUS_STYLES[value].idle
            }`}
          >
            {t(labelKey)}
          </Button>
        ))}
      </div>
      {selected && (
        <div className="mt-2">
          <Label htmlFor={noteId} className="sr-only">{t('noteLabel')}</Label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t('notePlaceholder')}
            disabled={logCheckin.isPending}
            rows={2}
            className="resize-none text-[13px]"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            loading={logCheckin.isPending}
            disabled={logCheckin.isPending}
            className="mt-1 bg-accent-2/10 px-3 py-1.5 text-[12px] font-medium text-accent-2 hover:bg-accent-2/20"
          >
            {logCheckin.isPending ? t('logging') : t('log')}
          </Button>
        </div>
      )}
    </div>
  );
}
