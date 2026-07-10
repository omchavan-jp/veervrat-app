'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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
const STAGED_KEY = ['content-overrides', 'staged'];
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
  const queryClient = useQueryClient();

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [values, setValues] = useState<Record<OverrideLocale, string>>({ en: '', mr: '' });
  const initedKeyRef = useRef<string | null>(null);

  // Current staged overrides (with attribution) so re-opening a key shows the unpublished
  // value and who last edited it — not just the baked original.
  const { data: staged, isLoading } = useQuery({
    queryKey: STAGED_KEY,
    queryFn: () => contentOverridesApi.list(),
    enabled: selection !== null,
  });

  // A unique selection opens straight into editing; an ambiguous one waits for a pick.
  useEffect(() => {
    if (!selection) setActiveKey(null);
    else if (selection.keys.length === 1) setActiveKey(selection.keys[0]);
    else setActiveKey(null);
  }, [selection]);

  // Canonical published values — the ICU-parity baseline and the "original" reference.
  const baked = useMemo<Record<OverrideLocale, string>>(
    () => ({
      en: activeKey ? (EN_FLAT[activeKey] ?? '') : '',
      mr: activeKey ? (MR_FLAT[activeKey] ?? '') : '',
    }),
    [activeKey],
  );

  // What the fields start from: the staged (unpublished) value if any, else the baked one.
  const effective = useMemo<Record<OverrideLocale, string>>(
    () => ({
      en: (activeKey ? staged?.en?.[activeKey]?.value : undefined) ?? baked.en,
      mr: (activeKey ? staged?.mr?.[activeKey]?.value : undefined) ?? baked.mr,
    }),
    [activeKey, staged, baked],
  );

  // Seed the fields once per key (after staged settles) — never mid-edit on a background refetch.
  useEffect(() => {
    if (!activeKey) {
      initedKeyRef.current = null;
      return;
    }
    if (initedKeyRef.current !== activeKey && !isLoading) {
      setValues(effective);
      initedKeyRef.current = activeKey;
    }
  }, [activeKey, isLoading, effective]);

  const save = useMutation({
    mutationFn: async () => {
      if (!activeKey) return;
      for (const locale of LOCALES) {
        // Save only locales actually changed, so untouched ones keep their existing author.
        if (values[locale].length > 0 && values[locale] !== effective[locale]) {
          await contentOverridesApi.upsert({
            key: activeKey,
            locale,
            value: values[locale],
            baseValue: baked[locale],
          });
        }
      }
    },
    onSuccess: () => {
      toast.add({ title: t('savedTitle'), type: 'success' });
      void queryClient.invalidateQueries({ queryKey: STAGED_KEY });
      // Re-render server components so getRequestConfig re-merges and the edit shows live.
      router.refresh();
      onClose();
    },
    onError: () => toast.add({ title: t('saveError'), type: 'error' }),
  });

  const discard = useMutation({
    mutationFn: async () => {
      if (!activeKey) return;
      for (const locale of LOCALES) {
        if (staged?.[locale]?.[activeKey]) {
          await contentOverridesApi.discard({ key: activeKey, locale });
        }
      }
    },
    onSuccess: () => {
      toast.add({ title: t('discarded'), type: 'success' });
      void queryClient.invalidateQueries({ queryKey: STAGED_KEY });
      router.refresh();
      onClose();
    },
    onError: () => toast.add({ title: t('discardError'), type: 'error' }),
  });

  const open = selection !== null;
  const ambiguous = selection !== null && selection.keys.length > 1 && !activeKey;
  const invalidLocale = LOCALES.find(
    (l) => values[l].length > 0 && !placeholdersEqual(baked[l], values[l]),
  );
  const hasStaged = Boolean(activeKey && (staged?.en?.[activeKey] || staged?.mr?.[activeKey]));

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
      ) : activeKey && isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" label={t('stagedLoading')} />
        </div>
      ) : activeKey ? (
        <div className="flex flex-col gap-4">
          {LOCALES.map((locale) => {
            const entry = staged?.[locale]?.[activeKey];
            const mismatch =
              values[locale].length > 0 && !placeholdersEqual(baked[locale], values[locale]);
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
                {entry && (
                  <div className="mt-1.5 space-y-0.5 text-[12px] text-muted">
                    <p>
                      {t('stagedBy', { name: entry.editedByName })}
                      {entry.editedAt ? ` · ${formatWhen(entry.editedAt)}` : ''}
                    </p>
                    <p>
                      {t('originalLabel')}: <span className="italic">{baked[locale] || '—'}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {invalidLocale && <p className="text-[12px] text-danger">{t('placeholderMismatch')}</p>}
          <div className="flex justify-end gap-2">
            {hasStaged && (
              <button
                type="button"
                onClick={() => discard.mutate()}
                disabled={discard.isPending}
                className="mr-auto rounded-full px-3 py-1.5 text-[13px] text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                {discard.isPending ? t('discarding') : t('discard')}
              </button>
            )}
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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}
