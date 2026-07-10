'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMessages, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Check, Pencil, UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { contentOverridesApi } from '@/lib/api/content-overrides';
import {
  buildValueIndex,
  findKeysByText,
  flattenMessages,
  type NestedMessages,
} from '@/lib/content-editor/messages';
import { ContentEditPanel } from './content-edit-panel';

const ENABLED = process.env.NEXT_PUBLIC_CONTENT_EDIT === 'on';

// Dev-only in-context content editor. Rendered (and dynamically imported) only when
// NEXT_PUBLIC_CONTENT_EDIT is 'on', so it is excluded from the production bundle.
export function ContentEditor() {
  if (!ENABLED) return null;
  return <ContentEditorInner />;
}

function ContentEditorInner() {
  const t = useTranslations('contentEditor');
  const toast = useToast();
  const messages = useMessages() as unknown as NestedMessages;
  const index = useMemo(() => buildValueIndex(flattenMessages(messages)), [messages]);

  const [editMode, setEditMode] = useState(false);
  const [selection, setSelection] = useState<{ keys: string[] } | null>(null);

  // In edit mode, an ⌥/Alt-click on any text resolves it back to its message key(s) via
  // reverse-lookup, then opens the edit panel. Capture phase + preventDefault so the click
  // never also triggers the underlying control.
  const onDocClick = useCallback(
    (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      const text = target?.textContent ?? '';
      if (!text.trim()) return;
      const keys = findKeysByText(index, text);
      if (keys.length === 0) {
        toast.add({ title: t('noKey'), type: 'error' });
        return;
      }
      setSelection({ keys });
    },
    [index, t, toast],
  );

  useEffect(() => {
    if (!editMode) return;
    document.addEventListener('click', onDocClick, true);
    document.body.style.cursor = 'crosshair';
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.body.style.cursor = '';
    };
  }, [editMode, onDocClick]);

  const publish = useMutation({
    mutationFn: () => contentOverridesApi.publish(),
    onSuccess: ({ prUrl }) => {
      toast.add({ title: t('publishedTitle'), description: prUrl, type: 'success' });
    },
    onError: () => toast.add({ title: t('publishError'), type: 'error' }),
  });

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[45] flex items-center gap-1 rounded-full border border-border bg-surface/95 px-1.5 py-1 shadow-modal backdrop-blur">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          aria-pressed={editMode}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors',
            editMode ? 'bg-accent text-bg' : 'text-muted hover:text-fg',
          )}
        >
          {editMode ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Pencil className="h-4 w-4" aria-hidden />
          )}
          {editMode ? t('editingOn') : t('editContent')}
        </button>
        <button
          type="button"
          onClick={() => publish.mutate()}
          disabled={publish.isPending}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          <UploadCloud className="h-4 w-4" aria-hidden />
          {publish.isPending ? t('publishing') : t('publish')}
        </button>
      </div>

      <ContentEditPanel selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}
