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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadsApi } from '@/lib/api/uploads';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/api/query-keys';
import { blogsApi, type Blog } from '@/lib/api/blogs';
import type { TiptapDoc } from '@/components/chat/message-content';

export function BlogEditor({ existing }: { existing?: Blog }) {
  const t = useTranslations('blogs');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(existing?.title ?? '');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image.configure({ inline: false })],
    content: existing?.body as object | undefined,
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] rounded-2xl border border-border bg-surface px-5 py-4 text-[15px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_h2]:text-xl [&_h2]:font-display [&_h2]:mt-4 [&_img]:max-h-80 [&_img]:rounded-xl [&_img]:my-3',
      },
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.blogs.list });
    queryClient.invalidateQueries({ queryKey: queryKeys.blogs.mine });
  };

  const persist = async (publish: boolean) => {
    const body = editor?.getJSON() as TiptapDoc;
    if (existing) {
      await blogsApi.update(existing.id, { title, body, ...(publish ? { isDraft: false } : {}) });
      return existing.id;
    }
    const created = await blogsApi.create({ title, body });
    if (publish) await blogsApi.update(created.id, { isDraft: false });
    return created.id;
  };

  const saveDraft = useMutation({
    mutationFn: () => persist(false),
    onSuccess: () => {
      invalidate();
      toast({ title: t('savedDraft') });
      router.push('/blogs/mine');
    },
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });

  const publish = useMutation({
    mutationFn: () => persist(true),
    onSuccess: (id) => {
      invalidate();
      toast({ title: t('published') });
      router.push(`/community/blogs/${id}`);
    },
    onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
  });

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const { url } = await uploadsApi.uploadBlogImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      toast({ title: t('imageError'), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const busy = saveDraft.isPending || publish.isPending;
  const canSave = title.trim().length > 0;

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-[28px] font-medium tracking-tight">
        {existing ? t('editTitle') : t('newTitle')}
      </h1>

      <Label htmlFor="blog-title" className="sr-only">
        {t('titleLabel')}
      </Label>
      <Input
        id="blog-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('titlePlaceholder')}
        className="mt-5 h-auto rounded-xl border border-border bg-surface px-4 py-3 font-display text-[20px] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <div className="mt-3">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            className="min-h-[300px] animate-pulse rounded-2xl border border-border bg-surface motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
      </div>

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

      <div className="mt-7 flex justify-end gap-2 border-t border-border pt-5">
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
  );
}
