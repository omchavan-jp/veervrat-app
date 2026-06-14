'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { useErcItems } from '@/hooks/use-journeys';
import { ErcPoolSection } from './erc-pool-section';
import { ErcItemCard } from './erc-item-card';
import { CustomErcForm } from './custom-erc-form';

type Props = { journeyId: string; hasVm: boolean; viewerIsVm?: boolean };

export function ResolutionsTab({ journeyId, hasVm, viewerIsVm = false }: Props) {
  const t = useTranslations('journey.erc');
  const { data: items = [], isLoading } = useErcItems(journeyId, 'resolution');
  const [customOpen, setCustomOpen] = useState(false);
  const hasItems = items.length > 0;

  return (
    <div>
      {!viewerIsVm && <ErcPoolSection journeyId={journeyId} ercType="resolution" defaultOpen={!hasItems} />}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[14px] text-muted">Browse the pool above to select your first resolutions.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ErcItemCard key={item.id} item={item} ercType="resolution" journeyId={journeyId} hasVm={hasVm} viewerIsVm={viewerIsVm} />
          ))}
        </div>
      )}

      {!viewerIsVm && (
        <button
          onClick={() => setCustomOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-strong px-4 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-fg"
        >
          <Plus className="h-4 w-4" />
          {t('addCustomResolution')}
        </button>
      )}
      <CustomErcForm journeyId={journeyId} ercType="resolution" open={customOpen} onOpenChange={setCustomOpen} />
    </div>
  );
}
