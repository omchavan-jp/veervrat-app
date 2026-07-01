'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Repeat } from 'lucide-react';
import type { ErcType, PoolItem } from '@/lib/api/journeys';
import { useErcPool, useSelectErc } from '@/hooks/use-journeys';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { BilingualText } from '@/components/shared/bilingual-text';

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
  const { data: pool = [], isLoading, isError } = useErcPool(journeyId, ercType);
  const select = useSelectErc(journeyId, ercType);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mb-6 rounded-xl border border-border bg-surface"
    >
      <CollapsibleTrigger className="group px-4 py-3 text-left">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {/* Suppress the count until data arrives so a misleading 0 never flashes. */}
          {isLoading ? t('poolLoading') : t(POOL_TITLE_KEY[ercType], { count: pool.length })}
        </span>
        <ChevronDown
          className="h-4 w-4 text-muted transition-transform group-data-[panel-open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsiblePanel className="border-t border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="text-destructive">{t('poolLoadError')}</AlertDescription>
            </Alert>
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
                  <BilingualText en={item.titleEn} mr={item.titleMr} size="sm" as="p" className="font-medium" />
                  {(item.descriptionMr || item.descriptionEn) && (
                    <BilingualText
                      en={item.descriptionEn ?? ''}
                      mr={item.descriptionMr}
                      size="sm"
                      as="div"
                      className="mt-0.5 text-muted"
                    />
                  )}
                  {item.frequencyLabel && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                      <Repeat className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{t('frequency')}</span>
                      {item.frequencyLabel}
                    </p>
                  )}
                  {item.durationDays && <p className="mt-0.5 text-[11px] text-muted">{t('days', { count: item.durationDays })}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={() => select.mutate({ poolItemId: item.id })}
                  disabled={select.isPending}
                  className="shrink-0 bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent-hover"
                >
                  {t('select')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CollapsiblePanel>
    </Collapsible>
  );
}
