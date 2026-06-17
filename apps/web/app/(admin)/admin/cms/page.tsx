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

type Editing = { key: string; isNew: boolean; titleEn: string; titleMr: string; bodyEn: string; bodyMr: string } | null;

export default function CmsPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

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
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) return null;

  const startEdit = (p: CmsPage) =>
    setEditing({ key: p.key, isNew: false, titleEn: p.titleEn, titleMr: p.titleMr ?? '', bodyEn: tiptapDocToText(p.bodyEn), bodyMr: tiptapDocToText(p.bodyMr) });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('cmsTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('cmsManageHint')}</p>
        </div>
        <Button onClick={() => setEditing({ key: '', isNew: true, titleEn: '', titleMr: '', bodyEn: '', bodyMr: '' })}>
          <Plus className="h-4 w-4" /> {t('newPage')}
        </Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      {editing && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <input
              value={editing.key}
              onChange={(e) => setEditing({ ...editing, key: e.target.value })}
              placeholder={t('cmsKeyHint')}
              disabled={!editing.isNew}
              className="rounded-xl border border-border bg-bg px-3 py-2 font-mono text-[13px] outline-none focus:border-accent disabled:opacity-60"
            />
            <input autoFocus value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} placeholder={t('titleEn')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.titleMr} onChange={(e) => setEditing({ ...editing, titleMr: e.target.value })} placeholder={t('titleMr')} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] outline-none focus:border-accent" />
            <textarea value={editing.bodyEn} onChange={(e) => setEditing({ ...editing, bodyEn: e.target.value })} placeholder={t('bodyEn')} rows={4} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <textarea value={editing.bodyMr} onChange={(e) => setEditing({ ...editing, bodyMr: e.target.value })} placeholder={t('bodyMr')} rows={4} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] outline-none focus:border-accent" />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.key.trim() || !editing.titleEn.trim() || !editing.bodyEn.trim() || save.isPending}>{save.isPending ? '…' : t('save')}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
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
                <button onClick={() => startEdit(p)} className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg" aria-label={t('edit')}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm(t('confirmDelete'))) remove.mutate(p.key); }} className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger" aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
