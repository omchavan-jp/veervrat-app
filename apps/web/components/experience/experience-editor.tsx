'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { uploadsApi } from '@/lib/api/uploads';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/api/query-keys';
import {
  experienceLogsApi,
  type ExperienceLog,
  type ExperienceVisibility,
  type ExperienceTagEntityType,
} from '@/lib/api/experience-logs';
import type { TiptapDoc } from '@/components/chat/message-content';
import { EntityTagPicker, type SelectedTag } from './entity-tag-picker';
import { errorMessage } from '@/lib/api/error-message';

const VISIBILITIES: ExperienceVisibility[] = ['ONLY_ME', 'FRIENDS', 'PUBLIC'];

// Shared editor for global + journey-scoped experience logs. `journeyId` pre-associates
// the entry (journey-scoped); `existing` switches to edit mode.
export function ExperienceEditor({
  journeyId,
  existing,
}: {
  journeyId?: string;
  existing?: ExperienceLog;
}) {
  const t = useTranslations('experiences');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<ExperienceVisibility>(
    existing?.visibility ?? 'ONLY_ME',
  );
  // Reactive emptiness flag so the submit guard re-evaluates as the user types
  // (editor.isEmpty alone does not trigger re-renders).
  const [isEmpty, setIsEmpty] = useState(true);
  const [tags, setTags] = useState<SelectedTag[]>(
    (existing?.tags ?? []).map((tg) => ({
      entityType: tg.entityType,
      entityId: tg.entityId,
      label: tg.entityId,
    })),
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image.configure({ inline: false })],
    content: existing?.body as object | undefined,
    onCreate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    onUpdate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    editorProps: {
      attributes: {
        class:
          'min-h-[240px] rounded-2xl border border-border bg-surface px-5 py-4 text-[15px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_h2]:text-xl [&_h2]:font-display [&_h2]:mt-4 [&_img]:max-h-80 [&_img]:rounded-xl [&_img]:my-3',
      },
    },
  });

  const apiTags = () =>
    tags.map((tg) => ({
      entityType: tg.entityType as ExperienceTagEntityType,
      entityId: tg.entityId,
    }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.experiences.mine });
    queryClient.invalidateQueries({ queryKey: queryKeys.experiences.public });
  };

  const saveDraft = useMutation({
    mutationFn: async () => {
      const body = editor?.getJSON() as TiptapDoc;
      if (existing) return experienceLogsApi.update(existing.id, { body, tags: apiTags() });
      return experienceLogsApi.create({ body, journeyId, tags: apiTags() });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t('savedDraft') });
      router.push('/experiences');
    },
    onError: (err) => toast({ title: errorMessage(err, t('saveError')), variant: 'destructive' }),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const body = editor?.getJSON() as TiptapDoc;
      if (existing) {
        return experienceLogsApi.update(existing.id, {
          body,
          visibility,
          isDraft: false,
          tags: apiTags(),
        });
      }
      const created = await experienceLogsApi.create({ body, journeyId, tags: apiTags() });
      return experienceLogsApi.update(created.id, { visibility, isDraft: false });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t('published') });
      router.push('/experiences');
    },
    onError: (err) => toast({ title: errorMessage(err, t('saveError')), variant: 'destructive' }),
  });

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const { url } = await uploadsApi.uploadExperienceImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      toast({ title: t('imageError'), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const busy = saveDraft.isPending || publish.isPending;
  const canSave = !!editor && !isEmpty;

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-[28px] font-medium tracking-tight">
        {existing ? t('editTitle') : t('newTitle')}
      </h1>
      {journeyId && <p className="mt-1 text-[13px] text-muted">{t('journeyScoped')}</p>}

      <div className="mt-5">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            className="min-h-[240px] animate-pulse rounded-2xl border border-border bg-surface motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
          hidden
          onChange={onPickImage}
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <span className="ml-1.5">{uploading ? t('uploading') : t('addImage')}</span>
        </Button>
      </div>

      {/* Entity tags */}
      <div className="mt-6">
        <div className="mb-2 text-[13px] font-medium">{t('tags')}</div>
        <EntityTagPicker tags={tags} onChange={setTags} />
      </div>

      {/* Visibility + actions */}
      <div className="mt-7 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-[13px] font-medium" id="visibility-label">
            {t('visibility')}
          </div>
          <ToggleGroup
            value={[visibility]}
            onValueChange={(value) => {
              // multiple=false; ignore deselection so visibility is never empty.
              const next = value[0] as ExperienceVisibility | undefined;
              if (next) setVisibility(next);
            }}
            aria-labelledby="visibility-label"
            className="gap-2"
          >
            {VISIBILITIES.map((v) => (
              <ToggleGroupItem
                key={v}
                value={v}
                size="sm"
                className="rounded-full px-3.5 py-1.5 text-[13px]"
              >
                {t(`visibilityOption.${v}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => saveDraft.mutate()}
            disabled={busy || !canSave}
          >
            {saveDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveDraft')}
          </Button>
          <Button type="button" onClick={() => publish.mutate()} disabled={busy || !canSave}>
            {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('publish')}
          </Button>
        </div>
      </div>
    </div>
  );
}
