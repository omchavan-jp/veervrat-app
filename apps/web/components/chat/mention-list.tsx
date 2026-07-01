'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { EntitySearchHit } from '@/lib/api/entity-search';

export type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

const LISTBOX_ID = 'mention-listbox';
const optionId = (entityType: string, entityId: string) => `mention-${entityType}-${entityId}`;

// The dropdown rendered inside the @/# suggestion popup. Receives Tiptap suggestion
// props; `command` inserts the chosen mention node into the document.
export const MentionList = forwardRef<MentionListRef, SuggestionProps<EntitySearchHit>>(
  function MentionList(props, ref) {
    const t = useTranslations();
    const items = props.items;
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    const choose = (index: number) => {
      const hit = items[index];
      if (!hit) return;
      props.command({
        entityType: hit.entityType,
        entityId: hit.entityId,
        label: hit.label,
      } as unknown as Record<string, unknown>);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        // Guard the empty case so a keydown that races ahead of an items update can
        // never produce a modulo-by-zero NaN index (and choose(NaN) on Enter).
        if (items.length === 0) return false;
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          choose(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-72 rounded-xl border border-border bg-surface p-3 text-[13px] text-muted shadow-raised">
          {t('chat.mention.no_matches')}
        </div>
      );
    }

    return (
      <ul
        id={LISTBOX_ID}
        role="listbox"
        aria-activedescendant={
          items[selected] ? optionId(items[selected].entityType, items[selected].entityId) : undefined
        }
        className="max-h-64 w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-raised"
      >
        {items.map((hit, i) => (
          <li key={`${hit.entityType}:${hit.entityId}`} role="presentation">
            <button
              type="button"
              role="option"
              id={optionId(hit.entityType, hit.entityId)}
              aria-selected={i === selected}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                i === selected ? 'bg-accent/10' : 'hover:bg-fg/5'
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate font-deva text-[14px]">{hit.label}</span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
                  {t(`entityType.${hit.entityType}`)}
                </span>
              </span>
              {hit.sublabel && hit.sublabel !== hit.label && (
                <span className="truncate text-[12px] text-muted">{hit.sublabel}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    );
  },
);
