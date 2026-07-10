'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import enMessages from '@/messages/en.json';
import mrMessages from '@/messages/mr.json';
import { flattenMessages, type NestedMessages } from '@/lib/content-editor/messages';
import { placeholdersEqual } from '@/lib/content-editor/icu';
import { contentOverridesApi, type OverrideLocale } from '@/lib/api/content-overrides';

// Both catalogs are loaded here (dev-only chunk) so the panel can edit en + mr side by side
// regardless of the active locale. Flattened once at module load.
const EN_FLAT = flattenMessages(enMessages as NestedMessages);
const MR_FLAT = flattenMessages(mrMessages as NestedMessages);
const FLAT_BY_LOCALE: Record<OverrideLocale, Record<string, string>> = { en: EN_FLAT, mr: MR_FLAT };
const LOCALES: OverrideLocale[] = ['en', 'mr'];
const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

export function ContentEditPanel({
  selection,
  onClose,
}: {
  selection: { keys: string[] } | null;
  onClose: () => void;
}) {
  const t = useTranslations('contentEditor');
  const toast = useToast();
  const router = useRouter();

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [values, setValues] = useState<Record<OverrideLocale, string>>({ en: '', mr: '' });

  // A unique selection opens straight into editing; an ambiguous one waits for a pick.
  useEffect(() => {
    if (!selection) {
      setActiveKey(null);
    } else if (selection.keys.length === 1) {
      setActiveKey(selection.keys[0]);
    } else {
      setActiveKey(null);
    }
  }, [selection]);

  const base = useMemo<Record<OverrideLocale, string>>(
    () => ({
      en: activeKey ? (EN_FLAT[activeKey] ?? '') : '',
      mr: activeKey ? (MR_FLAT[activeKey] ?? '') : '',
    }),
    [activeKey],
  );

  useEffect(() => {
    setValues(base);
  }, [base]);

  const save = useMutation({
    mutationFn: async () => {
      if (!activeKey) return;
      for (const locale of LOCALES) {
        if (values[locale].length > 0 && values[locale] !== base[locale]) {
          await contentOverridesApi.upsert({
            key: activeKey,
            locale,
            value: values[locale],
            baseValue: base[locale],
          });
        }
      }
    },
    onSuccess: () => {
      toast.add({ title: t('savedTitle'), type: 'success' });
      // Re-render server components so getRequestConfig re-merges and the edit shows live.
      router.refresh();
      onClose();
    },
    onError: () => toast.add({ title: t('saveError'), type: 'error' }),
  });

  const open = selection !== null;
  const ambiguous = selection !== null && selection.keys.length > 1 && !activeKey;
  const invalidLocale = LOCALES.find(
    (l) => values[l].length > 0 && !placeholdersEqual(base[l], values[l]),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('panelTitle')}
      description={activeKey ?? t('panelPickHint')}
      className="md:w-[min(560px,calc(100vw-40px))]"
    >
      {ambiguous && selection ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">{t('ambiguous')}</p>
          {selection.keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKey(k)}
              className="rounded-[12px] border border-border bg-surface px-3 py-2 text-left font-mono text-[12px] hover:border-accent"
            >
              {k}
            </button>
          ))}
        </div>
      ) : activeKey ? (
        <div className="flex flex-col gap-4">
          {LOCALES.map((locale) => {
            const mismatch =
              values[locale].length > 0 && !placeholdersEqual(base[locale], values[locale]);
            return (
              <div key={locale}>
                <Label className={FIELD_LABEL}>{t(locale === 'en' ? 'english' : 'marathi')}</Label>
                <Textarea
                  rows={2}
                  value={values[locale]}
                  onChange={(e) => setValues((v) => ({ ...v, [locale]: e.target.value }))}
                  className={cn(mismatch && 'border-danger')}
                />
                {FLAT_BY_LOCALE[locale][activeKey] === undefined && (
                  <p className="mt-1 text-[12px] text-muted">{t('missingLocale')}</p>
                )}
              </div>
            );
          })}
          {invalidLocale && <p className="text-[12px] text-danger">{t('placeholderMismatch')}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-fg"
            >
              {t('cancel')}
            </button>
            <Button
              type="button"
              disabled={save.isPending || Boolean(invalidLocale)}
              onClick={() => save.mutate()}
            >
              {save.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
