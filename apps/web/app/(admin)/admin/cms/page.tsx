'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { cmsApi, type CmsPage } from '@/lib/api/cms';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { textToTiptapDoc, tiptapDocToText } from '@/lib/tiptap-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';

type Editing = { key: string; isNew: boolean; titleEn: string; titleMr: string; bodyEn: string; bodyMr: string } | null;

const FIELD_LABEL = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

export default function CmsPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin, ready } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CmsPage | null>(null);

  const list = useQuery({ queryKey: queryKeys.cms.list, queryFn: () => cmsApi.list(), enabled: isAdmin });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.cms.list });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) =>
      cmsApi.upsert({
        key: e.key.trim(),
        titleEn: e.titleEn.trim(),
        titleMr: e.titleMr.trim() || undefined,
        bodyEn: textToTiptapDoc(e.bodyEn),
        bodyMr: e.bodyMr.trim() ? textToTiptapDoc(e.bodyMr) : undefined,
      }),
    onSuccess: () => { setEditing(null); setError(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (key: string) => cmsApi.remove(key),
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

  const startEdit = (p: CmsPage) =>
    setEditing({ key: p.key, isNew: false, titleEn: p.titleEn, titleMr: p.titleMr ?? '', bodyEn: tiptapDocToText(p.bodyEn), bodyMr: tiptapDocToText(p.bodyMr) });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('cmsTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('cmsManageHint')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing({ key: '', isNew: true, titleEn: '', titleMr: '', bodyEn: '', bodyMr: '' })}>
          <Plus className="h-4 w-4" /> {t('newPage')}
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
              <Label htmlFor="cms-key" className={FIELD_LABEL}>{t('cmsKeyLabel')}</Label>
              <Input
                id="cms-key"
                value={editing.key}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                placeholder={t('cmsKeyHint')}
                disabled={!editing.isNew}
                className="rounded-xl border border-border bg-bg px-3 py-2 font-mono text-[13px] focus:border-accent disabled:opacity-60"
              />
            </div>
            <div>
              <Label htmlFor="cms-titleEn" className={FIELD_LABEL}>{t('titleEn')}</Label>
              <Input id="cms-titleEn" autoFocus value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} placeholder={t('titleEn')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="cms-titleMr" className={FIELD_LABEL}>{t('titleMr')}</Label>
              <Input id="cms-titleMr" value={editing.titleMr} onChange={(e) => setEditing({ ...editing, titleMr: e.target.value })} placeholder={t('titleMr')} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="cms-bodyEn" className={FIELD_LABEL}>{t('bodyEn')}</Label>
              <Textarea id="cms-bodyEn" value={editing.bodyEn} onChange={(e) => setEditing({ ...editing, bodyEn: e.target.value })} placeholder={t('bodyEn')} rows={4} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent" />
            </div>
            <div>
              <Label htmlFor="cms-bodyMr" className={FIELD_LABEL}>{t('bodyMr')}</Label>
              <Textarea id="cms-bodyMr" value={editing.bodyMr} onChange={(e) => setEditing({ ...editing, bodyMr: e.target.value })} placeholder={t('bodyMr')} rows={4} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] focus:border-accent" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.key.trim() || !editing.titleEn.trim() || !editing.bodyEn.trim() || save.isPending}>{save.isPending ? t('saving') : t('save')}</Button>
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
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title={t('noPages')} description={t('cmsEmptyHint')} />
        ) : (
          <div className="space-y-2">
            {list.data!.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{p.titleEn}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted">{p.key}</div>
                </div>
                <button onClick={() => startEdit(p)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg" aria-label={t('edit')}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setPendingDelete(p)} disabled={remove.isPending && remove.variables === p.key} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50" aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button>
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
            <Button variant="destructive" loading={remove.isPending} disabled={remove.isPending} onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.key); }}>{t('delete')}</Button>
          </>
        }
      />
    </div>
  );
}
