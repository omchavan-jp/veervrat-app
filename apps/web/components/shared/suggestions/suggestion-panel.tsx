'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  contentSuggestionsApi,
  type SuggestionKind,
  type CreateSuggestionInput,
} from '@/lib/api/content-suggestions';
import { errorMessage } from '@/lib/api/error-message';
import { textToDoc } from '@/lib/suggestions/body';
import type { Anchor } from '@/lib/suggestions/anchor';

const KINDS: SuggestionKind[] = ['ADD_SECTION', 'EDIT_COPY', 'ADD_FIELD', 'REMOVE', 'NOTE'];

export type PanelContext = {
  anchor: Anchor;
  route: string;
  url: string;
  entityType?: string;
  entityId?: string;
};

/**
 * A panel, not a modal, and that is the whole point.
 *
 * The author is describing something on the page. A modal covers the page and asks them to
 * describe it from memory. This sits at the side and leaves the subject visible, which is also
 * why the picker's highlight stays on the anchored element while this is open.
 */
export function SuggestionPanel({
  context,
  onClose,
  onCreated,
}: {
  context: PanelContext;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations('suggestions');
  const locale = useLocale();
  const toast = useToast();

  const [kind, setKind] = useState<SuggestionKind>('ADD_SECTION');
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<'en' | 'mr'>(locale === 'mr' ? 'mr' : 'en');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyMr, setBodyMr] = useState('');

  // EDIT_COPY starts from what is already there. Without this the author retypes the sentence
  // they want to change, and triage has nothing to diff against.
  const currentText = context.anchor.anchorText;

  const create = useMutation({
    mutationFn: (input: CreateSuggestionInput) => contentSuggestionsApi.create(input),
    onSuccess: () => {
      toast.add({ title: t('saved'), type: 'success' });
      onCreated();
      onClose();
    },
    onError: (err) => toast.add({ title: errorMessage(err, t('saveError')), type: 'error' }),
  });

  const submit = () => {
    if (!title.trim()) return;
    create.mutate({
      kind,
      route: context.route,
      url: context.url,
      entityType: context.entityType,
      entityId: context.entityId,
      locale: locale === 'mr' ? 'MR' : 'EN',
      anchorKey: context.anchor.anchorKey,
      anchorText: context.anchor.anchorText,
      anchorPath: context.anchor.anchorPath,
      viewport: context.anchor.viewport,
      titleEn: title.trim(),
      bodyEn: textToDoc(bodyEn),
      bodyMr: textToDoc(bodyMr),
      currentText: kind === 'EDIT_COPY' ? currentText : undefined,
    });
  };

  return (
    <aside
      role="dialog"
      aria-label={t('panelTitle')}
      className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-2xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] tracking-tight">{t('panelTitle')}</h2>
          {/* What they pointed at, so there is no doubt which element this attaches to. */}
          <p className="mt-1 truncate font-mono text-[11px] text-muted">
            {context.anchor.anchorKey ?? context.anchor.anchorText ?? context.route}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-fg/5"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div>
          <Label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('kindLabel')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  kind === k
                    ? 'border-transparent bg-accent text-bg'
                    : 'border-border text-muted hover:border-fg/30'
                }`}
              >
                {t(`kind.${k}`)}
              </button>
            ))}
          </div>
        </div>

        {kind === 'EDIT_COPY' && currentText && (
          <div>
            <Label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {t('currentLabel')}
            </Label>
            <p className="rounded-lg border border-border bg-bg p-3 text-[13px] text-muted">
              {currentText}
            </p>
          </div>
        )}

        <div>
          <Label
            htmlFor="suggestion-title"
            className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
          >
            {t('titleLabel')}
          </Label>
          <Input
            id="suggestion-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
          />
        </div>

        <div>
          <Label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t('bodyLabel')}
          </Label>
          {/* Both languages are always reachable. A suggestion written only in Marathi is a
              perfectly good suggestion, and asking for English first would quietly discourage it. */}
          <Tabs
            items={[
              { key: 'en', label: t('english') },
              { key: 'mr', label: t('marathi') },
            ]}
            active={lang}
            onChange={(k) => setLang(k as 'en' | 'mr')}
            className="mb-3"
          />
          {lang === 'en' ? (
            <Textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              rows={8}
              placeholder={t('bodyPlaceholder')}
            />
          ) : (
            <Textarea
              value={bodyMr}
              onChange={(e) => setBodyMr(e.target.value)}
              rows={8}
              placeholder={t('bodyPlaceholder')}
            />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border p-5">
        <Button variant="outline" className="rounded-full" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          className="rounded-full"
          disabled={!title.trim() || create.isPending}
          loading={create.isPending}
          onClick={submit}
        >
          {t('submit')}
        </Button>
      </footer>
    </aside>
  );
}
