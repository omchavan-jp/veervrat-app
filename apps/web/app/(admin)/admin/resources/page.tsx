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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const FIELD_LABEL = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

type Editing = {
  id: string | null;
  type: 'FILE' | 'LINK';
  url: string;
  thumbnailUrl: string;
  title: string;
  oneLiner: string;
  looseTags: string;
} | null;

const empty: NonNullable<Editing> = {
  id: null,
  type: 'LINK',
  url: '',
  thumbnailUrl: '',
  title: '',
  oneLiner: '',
  looseTags: '',
};

export default function ResourcesPanel() {
  const t = useTranslations('admin');
  const qc = useQueryClient();
  const { isAdmin, ready } = useAdminGuard();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResourceSummary | null>(null);

  const list = useQuery({
    queryKey: queryKeys.content.resources(),
    queryFn: () => contentApi.resources(),
    enabled: isAdmin,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.content.resources() });

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => {
      const body: ResourceInput = {
        type: e.type,
        url: e.url.trim() || undefined,
        thumbnailUrl: e.thumbnailUrl.trim() || undefined,
        title: e.title.trim(),
        oneLiner: e.oneLiner.trim() || undefined,
        looseTags: e.looseTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      return e.id ? adminApi.updateResource(e.id, body) : adminApi.createResource(body);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteResource(id),
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

  const startEdit = (r: ResourceSummary) =>
    setEditing({
      id: r.id,
      type: r.type,
      url: r.url ?? '',
      thumbnailUrl: r.thumbnailUrl ?? '',
      title: r.title,
      oneLiner: r.oneLiner ?? '',
      looseTags: r.looseTags.join(', '),
    });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">
            {t('resourcesTitle')}
          </h1>
          <p className="mt-1 text-[14px] text-muted">{t('resourcesManageHint')}</p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing({ ...empty })}>
          <Plus className="h-4 w-4" /> {t('newResource')}
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
              <Label htmlFor="resource-type" className={FIELD_LABEL}>
                {t('type')}
              </Label>
              <Select
                value={editing.type}
                onValueChange={(value) => {
                  if (value) setEditing({ ...editing, type: value as 'FILE' | 'LINK' });
                }}
              >
                <SelectTrigger
                  id="resource-type"
                  aria-label={t('type')}
                  className="rounded-xl border-border bg-bg px-3 py-2 text-[14px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINK">{t('typeLink')}</SelectItem>
                  <SelectItem value="FILE">{t('typeFile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource-title" className={FIELD_LABEL}>
                {t('title')}
              </Label>
              <Input
                id="resource-title"
                autoFocus
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder={t('title')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="resource-url" className={FIELD_LABEL}>
                {t('url')}
              </Label>
              <Input
                id="resource-url"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder={t('url')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="resource-thumbnailUrl" className={FIELD_LABEL}>
                {t('thumbnailUrl')}
              </Label>
              <Input
                id="resource-thumbnailUrl"
                value={editing.thumbnailUrl}
                onChange={(e) => setEditing({ ...editing, thumbnailUrl: e.target.value })}
                placeholder={t('thumbnailUrl')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="resource-oneLiner" className={FIELD_LABEL}>
                {t('oneLiner')}
              </Label>
              <Input
                id="resource-oneLiner"
                value={editing.oneLiner}
                onChange={(e) => setEditing({ ...editing, oneLiner: e.target.value })}
                placeholder={t('oneLiner')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div>
              <Label htmlFor="resource-looseTags" className={FIELD_LABEL}>
                {t('looseTagsHint')}
              </Label>
              <Input
                id="resource-looseTags"
                value={editing.looseTags}
                onChange={(e) => setEditing({ ...editing, looseTags: e.target.value })}
                placeholder={t('looseTagsHint')}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-[14px] focus:border-accent"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => save.mutate(editing)}
                disabled={!editing.title.trim() || save.isPending}
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
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<Library className="h-5 w-5" />} title={t('noResources')} />
        ) : (
          <div className="space-y-2">
            {list.data!.items.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.title}</div>
                  {r.oneLiner && (
                    <div className="truncate text-[12px] text-muted">{r.oneLiner}</div>
                  )}
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {r.type}
                  </div>
                </div>
                <button
                  onClick={() => startEdit(r)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg"
                  aria-label={t('edit')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPendingDelete(r)}
                  disabled={remove.isPending && remove.variables === r.id}
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
