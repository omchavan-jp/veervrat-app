'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useErcItems } from '@/hooks/use-journeys';
import { ErcPoolSection } from './erc-pool-section';
import { ErcItemCard } from './erc-item-card';
import { CustomErcForm } from './custom-erc-form';

type Props = { journeyId: string; hasVm: boolean; viewerIsVm?: boolean };

export function ExposuresTab({ journeyId, hasVm, viewerIsVm = false }: Props) {
  const t = useTranslations('journey.erc');
  const { data: items = [], isLoading, isError } = useErcItems(journeyId, 'exposure');
  const [customOpen, setCustomOpen] = useState(false);
  const hasItems = items.length > 0;

  return (
    <div>
      {/* Pool selection is a VA action only */}
      {!viewerIsVm && <ErcPoolSection journeyId={journeyId} ercType="exposure" defaultOpen={!hasItems} />}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <p className="text-center text-[14px] text-muted">{t('emptyExposures')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ErcItemCard key={item.id} item={item} ercType="exposure" journeyId={journeyId} hasVm={hasVm} viewerIsVm={viewerIsVm} />
          ))}
        </div>
      )}

      {!viewerIsVm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomOpen(true)}
          className="mt-4"
        >
          <Plus className="h-4 w-4" />
          {t('addCustomExposure')}
        </Button>
      )}
      <CustomErcForm journeyId={journeyId} ercType="exposure" open={customOpen} onOpenChange={setCustomOpen} />
    </div>
  );
}
