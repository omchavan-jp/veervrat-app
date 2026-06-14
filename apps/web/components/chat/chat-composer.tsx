'use client';

import { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import 'tippy.js/dist/tippy.css';
import { useTranslations } from 'next-intl';
import { ImageIcon, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadsApi } from '@/lib/api/uploads';
import { useToast } from '@/hooks/use-toast';
import { entityMention } from './entity-mention';
import type { TiptapDoc } from './message-content';

// Rich chat composer: text + image nodes + @/# entity-reference chips. Emits the
// Tiptap JSON document on send; the server sanitizes it before persisting.
export function ChatComposer({
  roomId,
  disabled,
  onSend,
}: {
  roomId: string;
  disabled?: boolean;
  onSend: (doc: TiptapDoc) => void;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      entityMention('@'),
      entityMention('#'),
    ],
    editorProps: {
      attributes: {
        class:
          'min-h-[40px] max-h-40 overflow-y-auto px-4 py-2.5 text-sm focus:outline-none [&_p]:m-0 [&_.entity-chip]:text-accent [&_.entity-chip]:font-medium [&_img]:max-h-40 [&_img]:rounded-lg',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          // When a @/# suggestion popup is open, Enter belongs to it (select the
          // highlighted entity) — not to send. While a suggestion query is active the
          // plugin renders an inline decoration with the `.suggestion` class; if it's
          // present, let the suggestion handler take the key.
          if (view.dom.querySelector('.suggestion')) return false;
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
    },
  });

  const handleSend = () => {
    if (!editor || editor.isEmpty || disabled) return;
    const doc = editor.getJSON() as TiptapDoc;
    onSend(doc);
    editor.commands.clearContent(true);
  };

  const handleImagePick = async (file: File | undefined) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const { url } = await uploadsApi.uploadChatImage(file, roomId);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      toast({
        title: t('chat.error'),
        description: err instanceof Error ? err.message : t('chat.image_failed'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border px-3 py-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={(e) => handleImagePick(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        title={t('chat.add_image')}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </Button>

      <div className="flex-1 rounded-2xl border border-border bg-bg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <EditorContent editor={editor} />
      </div>

      <Button size="icon" onClick={handleSend} disabled={disabled || !editor || editor.isEmpty}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
