'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ErcType, PoolItem } from '@/lib/api/journeys';
import { useErcPool, useSelectErc } from '@/hooks/use-journeys';

const TIER_BADGE: Record<string, string> = {
  LOCAL: 'border-border text-muted',
  NATIONAL: 'border-accent-2/40 text-accent-2',
  INTERNATIONAL: 'border-accent/40 text-accent',
};

const TIER_LABEL_KEY: Record<string, string> = {
  LOCAL: 'tierLocal',
  NATIONAL: 'tierNational',
  INTERNATIONAL: 'tierInternational',
};

const POOL_TITLE_KEY: Record<ErcType, string> = {
  exposure: 'poolExposures',
  resolution: 'poolResolutions',
  challenge: 'poolChallenges',
};

const POOL_EMPTY_KEY: Record<ErcType, string> = {
  exposure: 'poolEmptyExposures',
  resolution: 'poolEmptyResolutions',
  challenge: 'poolEmptyChallenges',
};

type Props = {
  journeyId: string;
  ercType: ErcType;
  defaultOpen?: boolean;
};

export function ErcPoolSection({ journeyId, ercType, defaultOpen = true }: Props) {
  const t = useTranslations('journey.erc');
  const [open, setOpen] = useState(defaultOpen);
  const { data: pool = [], isLoading } = useErcPool(journeyId, ercType);
  const select = useSelectErc(journeyId, ercType);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {t(POOL_TITLE_KEY[ercType], { count: isLoading ? 0 : pool.length })}
        </span>
        <span className="text-muted">{open ? '↑' : '↓'}</span>
      </button>

      {open && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : pool.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">
              {t(POOL_EMPTY_KEY[ercType])}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {(pool as PoolItem[]).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      {item.tier && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${TIER_BADGE[item.tier] ?? ''}`}>
                          {TIER_LABEL_KEY[item.tier] ? t(TIER_LABEL_KEY[item.tier]) : item.tier}
                        </span>
                      )}
                    </div>
                    {item.titleMr ? (
                      <>
                        <p className="font-deva text-[15px] font-medium leading-snug">{item.titleMr}</p>
                        <p className="text-[12px] text-muted">{item.titleEn}</p>
                      </>
                    ) : (
                      <p className="text-[14px] font-medium">{item.titleEn}</p>
                    )}
                    {item.descriptionMr ? (
                      <p className="mt-0.5 font-deva text-[12px] text-muted">{item.descriptionMr}</p>
                    ) : (
                      item.descriptionEn && <p className="mt-0.5 text-[12px] text-muted">{item.descriptionEn}</p>
                    )}
                    {item.frequencyLabel && <p className="mt-0.5 text-[11px] text-muted">🔁 {item.frequencyLabel}</p>}
                    {item.durationDays && <p className="mt-0.5 text-[11px] text-muted">{t('days', { count: item.durationDays })}</p>}
                  </div>
                  <button
                    onClick={() => select.mutate({ poolItemId: item.id })}
                    disabled={select.isPending}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent-hover disabled:opacity-40"
                  >
                    {t('select')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
