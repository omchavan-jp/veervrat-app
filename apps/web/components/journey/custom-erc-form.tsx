'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateCustomErc } from '@/hooks/use-journeys';
import type { ErcType, CustomErcInput } from '@/lib/api/journeys';

const TIERS = ['LOCAL', 'NATIONAL', 'INTERNATIONAL'] as const;

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<(typeof TIERS)[number]>('LOCAL');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [frequencyPerWeek, setFrequencyPerWeek] = useState('');
  const [frequencyLabel, setFrequencyLabel] = useState('');
  const [durationDays, setDurationDays] = useState('');

  const reset = () => {
    setTitle(''); setDescription(''); setTier('LOCAL');
    setDurationWeeks(''); setFrequencyPerWeek(''); setFrequencyLabel(''); setDurationDays('');
  };

  const submit = () => {
    const data: CustomErcInput = { titleEn: title.trim() };
    if (description.trim()) data.descriptionEn = description.trim();
    if (ercType === 'exposure') data.tier = tier;
    if (ercType === 'resolution') {
      if (durationWeeks) data.durationWeeks = Number(durationWeeks);
      if (frequencyPerWeek) data.frequencyPerWeek = Number(frequencyPerWeek);
      if (frequencyLabel.trim()) data.frequencyLabel = frequencyLabel.trim();
    }
    if (ercType === 'challenge' && durationDays) data.durationDays = Number(durationDays);

    create.mutate(data, {
      onSuccess: () => { reset(); onOpenChange(false); },
    });
  };

  const titleKey =
    ercType === 'exposure' ? 'addCustomExposure' : ercType === 'resolution' ? 'addCustomResolution' : 'addCustomChallenge';

  const inputCls =
    'w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent';
  const labelCls = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(titleKey)}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('customCancel')}</Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending} loading={create.isPending}>
            {t('customCreate')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{t('customTitle')}</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('customTitlePlaceholder')} maxLength={200} autoFocus />
        </div>
        <div>
          <label className={labelCls}>{t('customDescription')}</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('customDescriptionPlaceholder')} maxLength={500} />
        </div>

        {ercType === 'exposure' && (
          <div>
            <label className={labelCls}>{t('customTier')}</label>
            <div className="flex gap-2">
              {TIERS.map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTier(tr)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-[13px] transition-colors ${tier === tr ? 'border-accent bg-accent/10 text-accent' : 'border-border-strong text-muted hover:border-accent'}`}
                >
                  {t(tr === 'LOCAL' ? 'tierLocal' : tr === 'NATIONAL' ? 'tierNational' : 'tierInternational')}
                </button>
              ))}
            </div>
          </div>
        )}

        {ercType === 'resolution' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('customDurationWeeks')}</label>
              <input type="number" min={1} className={inputCls} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('customFrequencyPerWeek')}</label>
              <input type="number" min={1} className={inputCls} value={frequencyPerWeek} onChange={(e) => setFrequencyPerWeek(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t('customFrequencyLabel')}</label>
              <input className={inputCls} value={frequencyLabel} onChange={(e) => setFrequencyLabel(e.target.value)} placeholder={t('customFrequencyLabelPlaceholder')} maxLength={80} />
            </div>
          </div>
        )}

        {ercType === 'challenge' && (
          <div>
            <label className={labelCls}>{t('customDurationDays')}</label>
            <input type="number" min={1} className={inputCls} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
