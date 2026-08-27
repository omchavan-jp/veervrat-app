/**
 * The proposed content, stored in the shape `CmsPage` already uses.
 *
 * v1 captures plain text: a rich editor is the "granular design" this change deliberately traded
 * away for coverage of every page. But the column is `Json` and holds a **Tiptap document**, so
 * when a real editor is dropped in later it reads every existing row without a migration and
 * without a compatibility branch.
 *
 * Storing a bare string would have made that upgrade a data migration. This costs four lines now
 * and saves that.
 */
export type TiptapDoc = {
  type: 'doc';
  content: { type: 'paragraph'; content?: { type: 'text'; text: string }[] }[];
};

export function textToDoc(text: string): TiptapDoc | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return {
    type: 'doc',
    content: trimmed.split(/\n{2,}/).map((para) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: para.trim() }],
    })),
  };
}

/** Reads a stored doc back to text. Tolerates anything that is not the shape we wrote. */
export function docToText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const content = (doc as TiptapDoc).content;
  if (!Array.isArray(content)) return '';
  return content
    .map((node) => (node.content ?? []).map((c) => c.text ?? '').join(''))
    .filter(Boolean)
    .join('\n\n');
}
