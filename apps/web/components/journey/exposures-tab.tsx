'use client';

import { useErcItems } from '@/hooks/use-journeys';
import { ErcPoolSection } from './erc-pool-section';
import { ErcItemCard } from './erc-item-card';

type Props = { journeyId: string; hasVm: boolean; viewerIsVm?: boolean };

export function ExposuresTab({ journeyId, hasVm, viewerIsVm = false }: Props) {
  const { data: items = [], isLoading } = useErcItems(journeyId, 'exposure');
  const hasItems = items.length > 0;

  return (
    <div>
      {/* Pool selection is a VA action only */}
      {!viewerIsVm && <ErcPoolSection journeyId={journeyId} ercType="exposure" defaultOpen={!hasItems} />}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[14px] text-muted">Browse the pool above to select your first exposures.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ErcItemCard key={item.id} item={item} ercType="exposure" journeyId={journeyId} hasVm={hasVm} viewerIsVm={viewerIsVm} />
          ))}
        </div>
      )}
    </div>
  );
}
