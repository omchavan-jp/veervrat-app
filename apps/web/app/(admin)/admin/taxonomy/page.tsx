'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { virtuesApi } from '@/lib/api/virtues';
import { adminApi, type VirtueInput } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type Editing = { id: string | null; nameEn: string; nameMr: string; description: string } | null;

export default function TaxonomyPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const virtues = useQuery({ queryKey: queryKeys.virtues.list, queryFn: () => virtuesApi.list(), enabled: isAdmin });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.virtues.list });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => {
      const body: VirtueInput = {
        nameEn: e.nameEn.trim(),
        nameMr: e.nameMr.trim() || undefined,
        description: e.description.trim() || undefined,
      };
      return e.id ? adminApi.updateVirtue(e.id, body) : adminApi.createVirtue(body);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteVirtue(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('taxonomyTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('taxonomyManageHint')}</p>
        </div>
        <Button onClick={() => setEditing({ id: null, nameEn: '', nameMr: '', description: '' })}>
          <Plus className="h-4 w-4" /> {t('newVirtue')}
        </Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      {editing && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <input
              autoFocus
              value={editing.nameEn}
              onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
              placeholder={t('nameEn')}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
            <input
              value={editing.nameMr}
              onChange={(e) => setEditing({ ...editing, nameMr: e.target.value })}
              placeholder={t('nameMr')}
              className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] outline-none focus:border-accent"
            />
            <textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder={t('description')}
              rows={3}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.nameEn.trim() || save.isPending}>
                {save.isPending ? '…' : t('save')}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {virtues.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (virtues.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title={t('noVirtues')} />
        ) : (
          <div className="space-y-2">
            {virtues.data!.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{v.nameEn}</div>
                  {v.nameMr && <div className="font-deva text-[13px] text-muted">{v.nameMr}</div>}
                  <div className="mt-0.5 text-[11px] text-muted">{t('subvirtueCount', { count: v.subvirtueCount })}</div>
                </div>
                <button
                  onClick={() => setEditing({ id: v.id, nameEn: v.nameEn, nameMr: v.nameMr ?? '', description: v.description ?? '' })}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg"
                  aria-label={t('edit')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('confirmDelete'))) remove.mutate(v.id);
                  }}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
