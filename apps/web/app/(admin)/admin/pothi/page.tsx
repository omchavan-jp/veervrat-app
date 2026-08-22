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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';

const FIELD_LABEL = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

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
  const { isAdmin, ready } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PothiSection | null>(null);

  const list = useQuery({
    queryKey: queryKeys.content.pothi,
    queryFn: () => contentApi.pothiSections(),
    enabled: isAdmin,
  });
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
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePothiSection(id),
    onSuccess: () => {
      setPendingDelete(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (ready && !isAdmin) return null;
  if (!ready)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('pothiTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('pothiManageHint')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing({ ...empty })}>
          <Plus className="h-4 w-4" /> {t('newSection')}
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
              <Label htmlFor="pothi-sectionNumber" className={FIELD_LABEL}>
                {t('sectionNumber')}
              </Label>
              <Input
                id="pothi-sectionNumber"
                type="number"
                value={editing.sectionNumber}
                onChange={(e) => setEditing({ ...editing, sectionNumber: e.target.value })}
                placeholder={t('sectionNumber')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="pothi-titleEn" className={FIELD_LABEL}>
                {t('titleEn')}
              </Label>
              <Input
                id="pothi-titleEn"
                autoFocus
                value={editing.titleEn}
                onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                placeholder={t('titleEn')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="pothi-titleMr" className={FIELD_LABEL}>
                {t('titleMr')}
              </Label>
              <Input
                id="pothi-titleMr"
                value={editing.titleMr}
                onChange={(e) => setEditing({ ...editing, titleMr: e.target.value })}
                placeholder={t('titleMr')}
                className="rounded-xl border border-border bg-bg px-3 py-2 font-deva text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="pothi-introText" className={FIELD_LABEL}>
                {t('introText')}
              </Label>
              <Textarea
                id="pothi-introText"
                value={editing.introText}
                onChange={(e) => setEditing({ ...editing, introText: e.target.value })}
                placeholder={t('introText')}
                rows={2}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="pothi-congregationResponse" className={FIELD_LABEL}>
                {t('congregationResponse')}
              </Label>
              <Input
                id="pothi-congregationResponse"
                value={editing.congregationResponse}
                onChange={(e) => setEditing({ ...editing, congregationResponse: e.target.value })}
                placeholder={t('congregationResponse')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="pothi-postShlokaCommentary" className={FIELD_LABEL}>
                {t('postShlokaCommentary')}
              </Label>
              <Textarea
                id="pothi-postShlokaCommentary"
                value={editing.postShlokaCommentary}
                onChange={(e) => setEditing({ ...editing, postShlokaCommentary: e.target.value })}
                placeholder={t('postShlokaCommentary')}
                rows={2}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => save.mutate(editing)}
                disabled={!editing.titleEn.trim() || !editing.sectionNumber || save.isPending}
              >
                {save.isPending ? t('saving') : t('save')}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {list.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Spinner size="lg" label={t('loading')} />
          </div>
        ) : list.isError ? (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">{t('loadError')}</AlertDescription>
          </Alert>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title={t('noSections')} />
        ) : (
          <div className="space-y-2">
            {list.data!.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 font-mono text-[13px] text-accent">
                  {s.sectionNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{s.titleEn}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {t('shlokaCount', { count: s.shlokas.length })}
                  </div>
                </div>
                <button
                  onClick={() => startEdit(s)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg"
                  aria-label={t('edit')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPendingDelete(s)}
                  disabled={remove.isPending && remove.variables === s.id}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  aria-label={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('confirmDeleteTitle')}
        description={t('confirmDelete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={remove.isPending}
              disabled={remove.isPending}
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
            >
              {t('delete')}
            </Button>
          </>
        }
      />
    </div>
  );
}
