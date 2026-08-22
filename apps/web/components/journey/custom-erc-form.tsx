'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateCustomErc } from '@/hooks/use-journeys';
import type { ErcType, CustomErcInput } from '@/lib/api/journeys';

const TIERS = ['LOCAL', 'NATIONAL', 'INTERNATIONAL'] as const;

// Reject NaN / 0 / negatives / non-integers so an invalid paste never reaches the API.
function parsePositiveInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}

export function CustomErcForm({
  journeyId,
  ercType,
  open,
  onOpenChange,
}: {
  journeyId: string;
  ercType: ErcType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations('journey.erc');
  const create = useCreateCustomErc(journeyId, ercType);
  const ids = useId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<(typeof TIERS)[number]>('LOCAL');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [frequencyPerWeek, setFrequencyPerWeek] = useState('');
  const [frequencyLabel, setFrequencyLabel] = useState('');
  const [durationDays, setDurationDays] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setTier('LOCAL');
    setDurationWeeks('');
    setFrequencyPerWeek('');
    setFrequencyLabel('');
    setDurationDays('');
  };

  const submit = () => {
    const data: CustomErcInput = { titleEn: title.trim() };
    if (description.trim()) data.descriptionEn = description.trim();
    if (ercType === 'exposure') data.tier = tier;
    if (ercType === 'resolution') {
      const weeks = parsePositiveInt(durationWeeks);
      const perWeek = parsePositiveInt(frequencyPerWeek);
      if (weeks !== undefined) data.durationWeeks = weeks;
      if (perWeek !== undefined) data.frequencyPerWeek = perWeek;
      if (frequencyLabel.trim()) data.frequencyLabel = frequencyLabel.trim();
    }
    if (ercType === 'challenge') {
      const days = parsePositiveInt(durationDays);
      if (days !== undefined) data.durationDays = days;
    }

    create.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  const titleKey =
    ercType === 'exposure'
      ? 'addCustomExposure'
      : ercType === 'resolution'
        ? 'addCustomResolution'
        : 'addCustomChallenge';

  const labelCls = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(titleKey)}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('customCancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={!title.trim() || create.isPending}
            loading={create.isPending}
          >
            {t('customCreate')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {create.isError && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">
              {t('customCreateError')}
            </AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor={`${ids}-title`} className={labelCls}>
            {t('customTitle')}
          </Label>
          <Input
            id={`${ids}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('customTitlePlaceholder')}
            maxLength={200}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor={`${ids}-description`} className={labelCls}>
            {t('customDescription')}
          </Label>
          <Textarea
            id={`${ids}-description`}
            className="resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('customDescriptionPlaceholder')}
            maxLength={500}
          />
        </div>

        {ercType === 'exposure' && (
          <div>
            <span className={labelCls}>{t('customTier')}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={t('customTier')}>
              {TIERS.map((tr) => (
                <Button
                  key={tr}
                  type="button"
                  variant="outline"
                  role="radio"
                  aria-checked={tier === tr}
                  onClick={() => setTier(tr)}
                  className={`flex-1 px-3 py-2 text-[13px] ${tier === tr ? 'border-accent bg-accent/10 text-accent' : 'border-border-strong text-muted hover:border-accent'}`}
                >
                  {t(
                    tr === 'LOCAL'
                      ? 'tierLocal'
                      : tr === 'NATIONAL'
                        ? 'tierNational'
                        : 'tierInternational',
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {ercType === 'resolution' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${ids}-weeks`} className={labelCls}>
                {t('customDurationWeeks')}
              </Label>
              <Input
                id={`${ids}-weeks`}
                type="number"
                min={1}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`${ids}-perweek`} className={labelCls}>
                {t('customFrequencyPerWeek')}
              </Label>
              <Input
                id={`${ids}-perweek`}
                type="number"
                min={1}
                value={frequencyPerWeek}
                onChange={(e) => setFrequencyPerWeek(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor={`${ids}-freqlabel`} className={labelCls}>
                {t('customFrequencyLabel')}
              </Label>
              <Input
                id={`${ids}-freqlabel`}
                value={frequencyLabel}
                onChange={(e) => setFrequencyLabel(e.target.value)}
                placeholder={t('customFrequencyLabelPlaceholder')}
                maxLength={80}
              />
            </div>
          </div>
        )}

        {ercType === 'challenge' && (
          <div>
            <Label htmlFor={`${ids}-days`} className={labelCls}>
              {t('customDurationDays')}
            </Label>
            <Input
              id={`${ids}-days`}
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
