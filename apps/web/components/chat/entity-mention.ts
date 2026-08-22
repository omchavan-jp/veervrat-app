import Mention from '@tiptap/extension-mention';
import type { MentionOptions } from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  entitySearchApi,
  type EntitySearchHit,
  type EntitySearchScope,
} from '@/lib/api/entity-search';
import { MentionList, type MentionListRef } from './mention-list';

// One generic mention node carries entityType + entityId + label. The trigger char
// selects the search scope: '#' → shared taxonomy concepts, '@' → the caller's own
// items. Both render identically as a chip; the backend allowlists the entity types.
function suggestionConfig(
  char: string,
  scope: EntitySearchScope,
): Omit<SuggestionOptions, 'editor'> {
  return {
    char,
    items: async ({ query }: { query: string }): Promise<EntitySearchHit[]> => {
      if (query.trim().length < 2) return [];
      try {
        return await entitySearchApi.search(query, scope);
      } catch {
        return [];
      }
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          if (!props.clientRect) return;
          popup = tippy(document.body, {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate: (props) => {
          component?.updateProps(props);
          if (props.clientRect) {
            popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
          }
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.destroy();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  };
}

// A mention node configured for one trigger char. Tiptap requires a distinct extension
// instance per trigger, so the editor registers two (see chat-composer).
export function entityMention(char: '@' | '#') {
  const scope: EntitySearchScope = char === '#' ? 'concept' : 'mine';
  return Mention.extend({
    name: char === '#' ? 'entityHash' : 'entityAt',
    addAttributes() {
      return {
        entityType: { default: null },
        entityId: { default: null },
        label: { default: '' },
      };
    },
    renderHTML({ node }) {
      return [
        'span',
        {
          'data-entity-type': node.attrs.entityType,
          'data-entity-id': node.attrs.entityId,
          class: 'entity-chip',
        },
        `${char}${node.attrs.label}`,
      ];
    },
    renderText({ node }) {
      return `${char}${node.attrs.label}`;
    },
  }).configure({
    HTMLAttributes: { class: 'entity-chip' },
    suggestion: suggestionConfig(char, scope),
  } as Partial<MentionOptions>);
}
