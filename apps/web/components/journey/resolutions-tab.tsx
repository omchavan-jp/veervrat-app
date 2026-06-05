'use client';

import { useErcItems } from '@/hooks/use-journeys';
import { ErcPoolSection } from './erc-pool-section';
import { ErcItemCard } from './erc-item-card';

type Props = { journeyId: string; hasVm: boolean };

export function ResolutionsTab({ journeyId, hasVm }: Props) {
  const { data: items = [], isLoading } = useErcItems(journeyId, 'resolution');
  const hasItems = items.length > 0;

  return (
    <div>
      <ErcPoolSection journeyId={journeyId} ercType="resolution" defaultOpen={!hasItems} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[14px] text-muted">Browse the pool above to select your first resolutions.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ErcItemCard key={item.id} item={item} ercType="resolution" journeyId={journeyId} hasVm={hasVm} />
          ))}
        </div>
      )}

      {hasItems && (
        <p className="mt-4 text-[12px] text-muted/60">
          Check-in logging coming soon (item 13).
        </p>
      )}
    </div>
  );
}
