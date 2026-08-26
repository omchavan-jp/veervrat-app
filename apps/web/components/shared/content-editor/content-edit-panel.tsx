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
import { errorMessage } from '@/lib/api/error-message';

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

  // Every candidate key is checked by default — a click almost always means "edit this
  // text", and disambiguation (content-editor.tsx) has usually already narrowed multi-key
  // matches down using DOM/route context. Genuine remaining ties stay visible so the
  // editor can uncheck the ones that don't apply.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<OverrideLocale, string>>({ en: '', mr: '' });
  const initedForRef = useRef<string | null>(null);
  const selectionSignature = selection?.keys.join('|') ?? null;

  const { data: staged, isLoading } = useQuery({
    queryKey: STAGED_KEY,
    queryFn: () => contentOverridesApi.list(),
    enabled: selection !== null,
  });

  useEffect(() => {
    setSelectedKeys(new Set(selection?.keys ?? []));
    initedForRef.current = null;
  }, [selectionSignature]);

  const bakedFor = (key: string, locale: OverrideLocale) => FLAT_BY_LOCALE[locale][key] ?? '';
  const effectiveFor = (key: string, locale: OverrideLocale) =>
    staged?.[locale]?.[key]?.value ?? bakedFor(key, locale);

  const checkedKeys = useMemo(() => Array.from(selectedKeys), [selectedKeys]);
  const primaryKey = checkedKeys[0] ?? null;

  // The edit fields seed from the first checked key. When several keys are checked, their
  // effective values were identical for the LOCALE that was clicked (that's why they
  // matched) but may genuinely differ in the other locale — divergentLocales below flags
  // that before it gets silently overwritten.
  const seed = useMemo<Record<OverrideLocale, string>>(
    () => ({
      en: primaryKey ? effectiveFor(primaryKey, 'en') : '',
      mr: primaryKey ? effectiveFor(primaryKey, 'mr') : '',
    }),
    // effectiveFor reads `staged`, already a dependency below via primaryKey/staged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryKey, staged],
  );

  // Seed once per distinct selection (not on every staged background refetch mid-edit).
  useEffect(() => {
    if (!primaryKey || isLoading) return;
    if (initedForRef.current !== selectionSignature) {
      setValues(seed);
      initedForRef.current = selectionSignature;
    }
  }, [primaryKey, isLoading, seed, selectionSignature]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const divergentLocales = LOCALES.filter((locale) => {
    if (checkedKeys.length < 2) return false;
    const first = effectiveFor(checkedKeys[0], locale);
    return checkedKeys.some((key) => effectiveFor(key, locale) !== first);
  });

  const save = useMutation({
    mutationFn: async () => {
      for (const key of checkedKeys) {
        for (const locale of LOCALES) {
          const value = values[locale];
          // Save only locales actually changed for this key, so untouched ones keep their
          // existing author.
          if (value.length === 0 || value === effectiveFor(key, locale)) continue;
          await contentOverridesApi.upsert({
            key,
            locale,
            value,
            baseValue: bakedFor(key, locale),
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
    onError: (err) => toast.add({ title: errorMessage(err, t('saveError')), type: 'error' }),
  });

  const discard = useMutation({
    mutationFn: async () => {
      for (const key of checkedKeys) {
        for (const locale of LOCALES) {
          if (staged?.[locale]?.[key]) {
            await contentOverridesApi.discard({ key, locale });
          }
        }
      }
    },
    onSuccess: () => {
      toast.add({ title: t('discarded'), type: 'success' });
      void queryClient.invalidateQueries({ queryKey: STAGED_KEY });
      router.refresh();
      onClose();
    },
    onError: (err) => toast.add({ title: errorMessage(err, t('discardError')), type: 'error' }),
  });

  const open = selection !== null;
  const multi = (selection?.keys.length ?? 0) > 1;
  const invalidLocale = LOCALES.find(
    (locale) =>
      values[locale].length > 0 &&
      checkedKeys.some((key) => !placeholdersEqual(bakedFor(key, locale), values[locale])),
  );
  const hasStaged = checkedKeys.some((key) => staged?.en?.[key] || staged?.mr?.[key]);
  // Attribution ("edited by … · original") is only meaningful for a single key — showing
  // it for a batch of keys would be ambiguous about whose edit it refers to.
  const singleEntry =
    checkedKeys.length === 1
      ? { en: staged?.en?.[checkedKeys[0]], mr: staged?.mr?.[checkedKeys[0]] }
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('panelTitle')}
      description={multi ? t('panelMultiHint', { count: checkedKeys.length }) : (primaryKey ?? '')}
      className="md:w-[min(560px,calc(100vw-40px))]"
    >
      {selection && (
        <div className="flex flex-col gap-4">
          {multi && (
            <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface p-2">
              <p className="px-1.5 pt-0.5 text-[12px] text-muted">{t('multiSelectHint')}</p>
              {selection.keys.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-[8px] px-1.5 py-1.5 text-[12px] hover:bg-fg/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    onChange={() => toggleKey(key)}
                    className="accent-accent"
                  />
                  <span className="truncate font-mono">{key}</span>
                </label>
              ))}
            </div>
          )}

          {primaryKey && isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" label={t('stagedLoading')} />
            </div>
          ) : primaryKey ? (
            <>
              {LOCALES.map((locale) => {
                const mismatch =
                  values[locale].length > 0 &&
                  checkedKeys.some(
                    (key) => !placeholdersEqual(bakedFor(key, locale), values[locale]),
                  );
                const entry = singleEntry?.[locale];
                return (
                  <div key={locale}>
                    <Label className={FIELD_LABEL}>
                      {t(locale === 'en' ? 'english' : 'marathi')}
                    </Label>
                    <Textarea
                      rows={2}
                      value={values[locale]}
                      onChange={(e) => setValues((v) => ({ ...v, [locale]: e.target.value }))}
                      className={cn(mismatch && 'border-danger')}
                    />
                    {checkedKeys.some((key) => FLAT_BY_LOCALE[locale][key] === undefined) && (
                      <p className="mt-1 text-[12px] text-muted">{t('missingLocale')}</p>
                    )}
                    {divergentLocales.includes(locale) && (
                      <p className="mt-1 text-[12px] text-warning">{t('divergentValues')}</p>
                    )}
                    {entry && (
                      <div className="mt-1.5 space-y-0.5 text-[12px] text-muted">
                        <p>
                          {t('stagedBy', { name: entry.editedByName })}
                          {entry.editedAt ? ` · ${formatWhen(entry.editedAt)}` : ''}
                        </p>
                        <p>
                          {t('originalLabel')}:{' '}
                          <span className="italic">{bakedFor(checkedKeys[0], locale) || '—'}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {invalidLocale && (
                <p className="text-[12px] text-danger">{t('placeholderMismatch')}</p>
              )}
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
                  disabled={save.isPending || Boolean(invalidLocale) || checkedKeys.length === 0}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? t('saving') : t('save')}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">{t('panelPickHint')}</p>
          )}
        </div>
      )}
    </Dialog>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}
