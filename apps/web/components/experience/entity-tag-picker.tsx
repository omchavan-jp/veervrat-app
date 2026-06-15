'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { entitySearchApi, type EntityRefType } from '@/lib/api/entity-search';
import type { ExperienceTagEntityType } from '@/lib/api/experience-logs';

export type SelectedTag = {
  entityType: ExperienceTagEntityType;
  entityId: string;
  label: string;
};

// entity-search returns lowercase types; experience tags use the uppercase TagEntityType.
function toTagType(t: EntityRefType): ExperienceTagEntityType {
  return t.toUpperCase() as ExperienceTagEntityType;
}

// Tag selector backed by the trigram entity-search endpoint. Optional, multiple tags.
export function EntityTagPicker({
  tags,
  onChange,
}: {
  tags: SelectedTag[];
  onChange: (tags: SelectedTag[]) => void;
}) {
  const t = useTranslations('experiences');
  const [query, setQuery] = useState('');

  const { data: hits } = useQuery({
    queryKey: ['entity-search', 'tags', query],
    queryFn: () => entitySearchApi.search(query, 'all'),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });

  const add = (entityType: ExperienceTagEntityType, entityId: string, label: string) => {
    if (tags.some((tg) => tg.entityType === entityType && tg.entityId === entityId)) return;
    onChange([...tags, { entityType, entityId, label }]);
    setQuery('');
  };

  const remove = (entityId: string) => onChange(tags.filter((tg) => tg.entityId !== entityId));

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tg) => (
            <span
              key={tg.entityId}
              className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[12px] text-accent"
            >
              {tg.label}
              <button type="button" onClick={() => remove(tg.entityId)} aria-label={t('removeTag')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tagSearchPlaceholder')}
          className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-[14px] outline-none focus:border-accent"
        />
        {query.trim().length >= 2 && hits && hits.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-raised">
            {hits.map((h) => (
              <button
                key={`${h.entityType}-${h.entityId}`}
                type="button"
                onClick={() => add(toTagType(h.entityType), h.entityId, h.label)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-fg/[0.04]"
              >
                <span className="truncate">{h.label}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted">
                  {h.entityType}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
