import type { TiptapDoc, TiptapNode } from '@/components/chat/message-content';

// Flattens a Tiptap doc to a short plain-text excerpt for list/card previews.
export function excerptFromDoc(doc: TiptapDoc | undefined, max = 180): string {
  if (!doc?.content) return '';
  const parts: string[] = [];
  const walk = (node: TiptapNode) => {
    if (node.type === 'text' && node.text) parts.push(node.text);
    node.content?.forEach(walk);
  };
  doc.content.forEach(walk);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
