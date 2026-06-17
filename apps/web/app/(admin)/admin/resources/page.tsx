'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Library } from 'lucide-react';
import { contentApi, type ResourceSummary } from '@/lib/api/content';
import { adminApi, type ResourceInput } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type Editing = {
  id: string | null;
  type: 'FILE' | 'LINK';
  url: string;
  thumbnailUrl: string;
  title: string;
  oneLiner: string;
  looseTags: string;
} | null;

const empty: NonNullable<Editing> = { id: null, type: 'LINK', url: '', thumbnailUrl: '', title: '', oneLiner: '', looseTags: '' };

export default function ResourcesPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({ queryKey: queryKeys.content.resources(), queryFn: () => contentApi.resources(), enabled: isAdmin });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.content.resources() });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => {
      const body: ResourceInput = {
        type: e.type,
        url: e.url.trim() || undefined,
        thumbnailUrl: e.thumbnailUrl.trim() || undefined,
        title: e.title.trim(),
        oneLiner: e.oneLiner.trim() || undefined,
        looseTags: e.looseTags.split(',').map((s) => s.trim()).filter(Boolean),
      };
      return e.id ? adminApi.updateResource(e.id, body) : adminApi.createResource(body);
    },
    onSuccess: () => { setEditing(null); setError(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteResource(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) return null;

  const startEdit = (r: ResourceSummary) =>
    setEditing({ id: r.id, type: r.type, url: r.url ?? '', thumbnailUrl: r.thumbnailUrl ?? '', title: r.title, oneLiner: r.oneLiner ?? '', looseTags: r.looseTags.join(', ') });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('resourcesTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('resourcesManageHint')}</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4" /> {t('newResource')}</Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      {editing && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as 'FILE' | 'LINK' })} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent">
              <option value="LINK">{t('typeLink')}</option>
              <option value="FILE">{t('typeFile')}</option>
            </select>
            <input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder={t('title')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder={t('url')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.thumbnailUrl} onChange={(e) => setEditing({ ...editing, thumbnailUrl: e.target.value })} placeholder={t('thumbnailUrl')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.oneLiner} onChange={(e) => setEditing({ ...editing, oneLiner: e.target.value })} placeholder={t('oneLiner')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.looseTags} onChange={(e) => setEditing({ ...editing, looseTags: e.target.value })} placeholder={t('looseTagsHint')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.title.trim() || save.isPending}>{save.isPending ? '…' : t('save')}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<Library className="h-5 w-5" />} title={t('noResources')} />
        ) : (
          <div className="space-y-2">
            {list.data!.items.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.title}</div>
                  {r.oneLiner && <div className="truncate text-[12px] text-muted">{r.oneLiner}</div>}
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{r.type}</div>
                </div>
                <button onClick={() => startEdit(r)} className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg" aria-label={t('edit')}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm(t('confirmDelete'))) remove.mutate(r.id); }} className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger" aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
