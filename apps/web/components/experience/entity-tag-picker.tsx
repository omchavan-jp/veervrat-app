'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { entitySearchApi, type EntityRefType } from '@/lib/api/entity-search';
import type { ExperienceTagEntityType } from '@/lib/api/experience-logs';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const queryEnabled = query.trim().length >= 2;

  const {
    data: hits,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['entity-search', 'tags', query],
    queryFn: () => entitySearchApi.search(query, 'all'),
    enabled: queryEnabled,
    staleTime: 10_000,
  });

  const add = (entityType: ExperienceTagEntityType, entityId: string, label: string) => {
    if (tags.some((tg) => tg.entityType === entityType && tg.entityId === entityId)) return;
    onChange([...tags, { entityType, entityId, label }]);
    setQuery('');
    setActiveIndex(-1);
  };

  // Remove by composite identity (type + id) to mirror add()'s dedupe key — removing
  // by entityId alone could drop a different-type tag sharing the same entityId.
  const remove = (entityType: ExperienceTagEntityType, entityId: string) =>
    onChange(tags.filter((tg) => !(tg.entityType === entityType && tg.entityId === entityId)));

  const showDropdown = queryEnabled;
  const results = hits ?? [];

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const h = results[activeIndex];
      add(toTagType(h.entityType), h.entityId, h.label);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
    }
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tg) => (
            <span
              key={`${tg.entityType}-${tg.entityId}`}
              className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[12px] text-accent"
            >
              {tg.label}
              <button
                type="button"
                onClick={() => remove(tg.entityType, tg.entityId)}
                aria-label={t('removeTag')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder={t('tagSearchPlaceholder')}
          className="rounded-lg border-border bg-bg py-2 pl-9 pr-3 text-[14px] focus-visible:border-accent"
        />
        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-raised"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-3 text-[13px] text-muted">
                <Spinner size="sm" tone="muted" label={t('loading')} />
              </div>
            ) : isError ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-danger">
                <span>{t('tagSearchError')}</span>
                <Button variant="outline" size="xs" type="button" onClick={() => refetch()}>
                  {t('retry')}
                </Button>
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-muted">{t('tagSearchEmpty')}</div>
            ) : (
              results.map((h, i) => (
                <button
                  key={`${h.entityType}-${h.entityId}`}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  type="button"
                  onClick={() => add(toTagType(h.entityType), h.entityId, h.label)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-fg/[0.04] ${
                    i === activeIndex ? 'bg-fg/[0.04]' : ''
                  }`}
                >
                  <span className="truncate">{h.label}</span>
                  <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted">
                    {t(`entityType.${toTagType(h.entityType)}`)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
