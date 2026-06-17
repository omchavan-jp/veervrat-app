import type { TiptapDoc, TiptapNode } from '@/components/chat/message-content';

// Minimal plain-text ⇄ Tiptap-doc conversion for the admin CMS editor. Each non-empty
// line becomes a paragraph; the rich editor can replace this later without a data change.
export function textToTiptapDoc(text: string): TiptapDoc {
  const paragraphs = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map<TiptapNode>((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }));
  return { type: 'doc', content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' }] };
}

export function tiptapDocToText(doc: TiptapDoc | null | undefined): string {
  if (!doc?.content) return '';
  const walk = (node: TiptapNode): string => {
    if (node.type === 'text') return node.text ?? '';
    return (node.content ?? []).map(walk).join('');
  };
  return doc.content.map(walk).join('\n');
}
