'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { contentApi, type PothiSection } from '@/lib/api/content';
import { adminApi, type PothiSectionInput } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminGuard } from '@/hooks/use-admin-guard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type Editing = {
  id: string | null;
  sectionNumber: string;
  titleEn: string;
  titleMr: string;
  introText: string;
  congregationResponse: string;
  postShlokaCommentary: string;
} | null;

const empty: NonNullable<Editing> = {
  id: null,
  sectionNumber: '',
  titleEn: '',
  titleMr: '',
  introText: '',
  congregationResponse: '',
  postShlokaCommentary: '',
};

export default function PothiPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({ queryKey: queryKeys.content.pothi, queryFn: () => contentApi.pothiSections(), enabled: isAdmin });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.content.pothi });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => {
      const body: PothiSectionInput = {
        sectionNumber: Number(e.sectionNumber),
        titleEn: e.titleEn.trim(),
        titleMr: e.titleMr.trim() || undefined,
        introText: e.introText.trim() || undefined,
        congregationResponse: e.congregationResponse.trim() || undefined,
        postShlokaCommentary: e.postShlokaCommentary.trim() || undefined,
      };
      return e.id ? adminApi.updatePothiSection(e.id, body) : adminApi.createPothiSection(body);
    },
    onSuccess: () => { setEditing(null); setError(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePothiSection(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) return null;

  const startEdit = (s: PothiSection) =>
    setEditing({
      id: s.id,
      sectionNumber: String(s.sectionNumber),
      titleEn: s.titleEn,
      titleMr: s.titleMr ?? '',
      introText: s.introText ?? '',
      congregationResponse: s.congregationResponse ?? '',
      postShlokaCommentary: s.postShlokaCommentary ?? '',
    });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('pothiTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('pothiManageHint')}</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4" /> {t('newSection')}</Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      {editing && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <input type="number" value={editing.sectionNumber} onChange={(e) => setEditing({ ...editing, sectionNumber: e.target.value })} placeholder={t('sectionNumber')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input autoFocus value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} placeholder={t('titleEn')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.titleMr} onChange={(e) => setEditing({ ...editing, titleMr: e.target.value })} placeholder={t('titleMr')} className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] outline-none focus:border-accent" />
            <textarea value={editing.introText} onChange={(e) => setEditing({ ...editing, introText: e.target.value })} placeholder={t('introText')} rows={2} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <input value={editing.congregationResponse} onChange={(e) => setEditing({ ...editing, congregationResponse: e.target.value })} placeholder={t('congregationResponse')} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <textarea value={editing.postShlokaCommentary} onChange={(e) => setEditing({ ...editing, postShlokaCommentary: e.target.value })} placeholder={t('postShlokaCommentary')} rows={2} className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(editing)} disabled={!editing.titleEn.trim() || !editing.sectionNumber || save.isPending}>{save.isPending ? '…' : t('save')}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title={t('noSections')} />
        ) : (
          <div className="space-y-2">
            {list.data!.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 font-mono text-[13px] text-accent">{s.sectionNumber}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{s.titleEn}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{t('shlokaCount', { count: s.shlokas.length })}</div>
                </div>
                <button onClick={() => startEdit(s)} className="rounded-lg p-2 text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg" aria-label={t('edit')}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm(t('confirmDelete'))) remove.mutate(s.id); }} className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger" aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
