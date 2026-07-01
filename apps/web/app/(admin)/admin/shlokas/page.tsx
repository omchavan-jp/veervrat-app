'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ScrollText } from 'lucide-react';
import { contentApi, type Shloka } from '@/lib/api/content';
import { adminApi, type ShlokaInput } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';

const FIELD_LABEL = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

type Editing = {
  id: string | null;
  devanagariText: string;
  transliteration: string;
  meaningEn: string;
  meaningMr: string;
  sourceCitation: string;
  looseTags: string;
} | null;

const empty: NonNullable<Editing> = {
  id: null,
  devanagariText: '',
  transliteration: '',
  meaningEn: '',
  meaningMr: '',
  sourceCitation: '',
  looseTags: '',
};

export default function ShlokasPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin, ready } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Shloka | null>(null);

  const list = useQuery({ queryKey: queryKeys.content.shlokas(), queryFn: () => contentApi.shlokas(), enabled: isAdmin });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.content.shlokas() });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => {
      const body: ShlokaInput = {
        devanagariText: e.devanagariText.trim(),
        transliteration: e.transliteration.trim() || undefined,
        meaningEn: e.meaningEn.trim() || undefined,
        meaningMr: e.meaningMr.trim() || undefined,
        sourceCitation: e.sourceCitation.trim() || undefined,
        looseTags: e.looseTags.split(',').map((s) => s.trim()).filter(Boolean),
      };
      return e.id ? adminApi.updateShloka(e.id, body) : adminApi.createShloka(body);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteShloka(id),
    onSuccess: () => { setPendingDelete(null); setError(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  if (ready && !isAdmin) return null;
  if (!ready)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );

  const startEdit = (s: Shloka) =>
    setEditing({
      id: s.id,
      devanagariText: s.devanagariText,
      transliteration: s.transliteration ?? '',
      meaningEn: s.meaningEn ?? '',
      meaningMr: s.meaningMr ?? '',
      sourceCitation: s.sourceCitation ?? '',
      looseTags: s.looseTags.join(', '),
    });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('shlokasTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('shlokasManageHint')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing({ ...empty })}>
          <Plus className="h-4 w-4" /> {t('newShloka')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {editing && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="shloka-devanagariText" className={FIELD_LABEL}>{t('devanagariText')}</Label>
              <Textarea
                id="shloka-devanagariText"
                autoFocus
                value={editing.devanagariText}
                onChange={(e) => setEditing({ ...editing, devanagariText: e.target.value })}
                placeholder={t('devanagariText')}
                rows={3}
                className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[16px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="shloka-transliteration" className={FIELD_LABEL}>{t('transliteration')}</Label>
              <Input id="shloka-transliteration" value={editing.transliteration} onChange={(e) => setEditing({ ...editing, transliteration: e.target.value })} placeholder={t('transliteration')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="shloka-meaningEn" className={FIELD_LABEL}>{t('meaningEn')}</Label>
              <Input id="shloka-meaningEn" value={editing.meaningEn} onChange={(e) => setEditing({ ...editing, meaningEn: e.target.value })} placeholder={t('meaningEn')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="shloka-meaningMr" className={FIELD_LABEL}>{t('meaningMr')}</Label>
              <Input id="shloka-meaningMr" value={editing.meaningMr} onChange={(e) => setEditing({ ...editing, meaningMr: e.target.value })} placeholder={t('meaningMr')} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="shloka-sourceCitation" className={FIELD_LABEL}>{t('sourceCitation')}</Label>
              <Input id="shloka-sourceCitation" value={editing.sourceCitation} onChange={(e) => setEditing({ ...editing, sourceCitation: e.target.value })} placeholder={t('sourceCitation')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="shloka-looseTags" className={FIELD_LABEL}>{t('looseTagsHint')}</Label>
              <Input id="shloka-looseTags" value={editing.looseTags} onChange={(e) => setEditing({ ...editing, looseTags: e.target.value })} placeholder={t('looseTagsHint')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.devanagariText.trim() || save.isPending}>
                {save.isPending ? t('saving') : t('save')}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><Spinner size="lg" label={t('loading')} /></div>
        ) : list.isError ? (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
          </Alert>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<ScrollText className="h-5 w-5" />} title={t('noShlokas')} />
        ) : (
          <div className="space-y-2">
            {list.data!.items.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-deva text-[15px]">{s.devanagariText}</div>
                  {s.sourceCitation && <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{s.sourceCitation}</div>}
                </div>
                <button onClick={() => startEdit(s)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg" aria-label={t('edit')}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setPendingDelete(s)} disabled={remove.isPending && remove.variables === s.id} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50" aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title={t('confirmDeleteTitle')}
        description={t('confirmDelete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>{t('cancel')}</Button>
            <Button variant="destructive" loading={remove.isPending} disabled={remove.isPending} onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); }}>{t('delete')}</Button>
          </>
        }
      />
    </div>
  );
}
