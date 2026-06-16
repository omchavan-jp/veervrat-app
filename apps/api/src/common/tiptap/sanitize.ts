// Tiptap JSON AST validation + structural sanitization for all user-generated rich
// text (chat messages, experience logs, blogs).
//
// Content is stored as a Tiptap JSON document (jsonb), NEVER as HTML. Per the
// Platform Engineering Standard, all user-generated rich text is structurally
// sanitized server-side before DB write: only allowlisted node/mark types survive,
// and link/image URLs are validated. This is the JSON-AST analogue of an HTML
// node-allowlist — a forged or XSS-laden payload is reduced to its safe subset.

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'heading',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'image',
  // Entity-reference nodes. Tiptap requires a unique extension (node) name per trigger
  // char, so the @ and # mentions are distinct node types; both validate identically.
  'entityAt',
  'entityHash',
]);

const ENTITY_MENTION_TYPES = new Set(['entityAt', 'entityHash']);

const ALLOWED_MARK_TYPES = new Set(['bold', 'italic', 'link']);

const ALLOWED_HEADING_LEVELS = new Set([2, 3, 4]);

// Entity-reference (@/#) target types. A mention node carries only an entityType +
// entityId + a display label — never trusted content. The label is clamped; the
// id/type are validated structurally. Rendering resolves the chip from these.
const ALLOWED_ENTITY_TYPES = new Set([
  'weakness',
  'virtue',
  'subvirtue',
  'sentence',
  'journey',
  'exposure',
  'resolution',
  'challenge',
]);

const MENTION_LABEL_MAX = 120;

export type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
};

export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TiptapDoc = {
  type: 'doc';
  content: TiptapNode[];
};

function isSafeUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function sanitizeMarks(marks: unknown): TiptapMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const clean: TiptapMark[] = [];
  for (const raw of marks) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as TiptapMark;
    if (!ALLOWED_MARK_TYPES.has(m.type)) continue;
    if (m.type === 'link') {
      const href = m.attrs?.href;
      if (!isSafeUrl(href)) continue;
      clean.push({
        type: 'link',
        attrs: { href, rel: 'noopener noreferrer nofollow', target: '_blank' },
      });
    } else {
      clean.push({ type: m.type });
    }
  }
  return clean.length > 0 ? clean : undefined;
}

function sanitizeNode(node: unknown): TiptapNode | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as TiptapNode;
  if (typeof n.type !== 'string' || !ALLOWED_NODE_TYPES.has(n.type)) return null;

  const out: TiptapNode = { type: n.type };

  if (n.type === 'text') {
    if (typeof n.text !== 'string') return null;
    out.text = n.text;
    const marks = sanitizeMarks(n.marks);
    if (marks) out.marks = marks;
    return out;
  }

  if (n.type === 'heading') {
    const level = n.attrs?.level;
    out.attrs = {
      level: typeof level === 'number' && ALLOWED_HEADING_LEVELS.has(level) ? level : 2,
    };
  }

  if (n.type === 'image') {
    const src = n.attrs?.src;
    if (!isSafeUrl(src)) return null; // drop images without a safe URL
    out.attrs = { src };
    return out;
  }

  if (ENTITY_MENTION_TYPES.has(n.type)) {
    const entityType = n.attrs?.entityType;
    const entityId = n.attrs?.entityId;
    const label = n.attrs?.label;
    if (typeof entityType !== 'string' || !ALLOWED_ENTITY_TYPES.has(entityType)) return null;
    if (typeof entityId !== 'string' || entityId.length === 0 || entityId.length > 64) return null;
    out.attrs = {
      entityType,
      entityId,
      label: typeof label === 'string' ? label.slice(0, MENTION_LABEL_MAX) : '',
    };
    return out; // leaf node — no children
  }

  if (Array.isArray(n.content)) {
    const children = n.content.map(sanitizeNode).filter((c): c is TiptapNode => c !== null);
    if (children.length > 0) out.content = children;
  }

  return out;
}

export class InvalidTiptapContentError extends Error {
  constructor(message = 'Invalid rich-text content') {
    super(message);
    this.name = 'InvalidTiptapContentError';
  }
}

// Validates the top-level shape is a Tiptap doc, then returns a structurally
// sanitized copy. Throws InvalidTiptapContentError if the payload is not a doc or
// reduces to empty (e.g. an entirely-disallowed payload).
export function sanitizeTiptapDoc(input: unknown): TiptapDoc {
  if (!input || typeof input !== 'object' || (input as TiptapNode).type !== 'doc') {
    throw new InvalidTiptapContentError('Content must be a Tiptap document');
  }
  const doc = input as TiptapNode;
  const content = Array.isArray(doc.content)
    ? doc.content.map(sanitizeNode).filter((c): c is TiptapNode => c !== null)
    : [];

  if (content.length === 0) {
    throw new InvalidTiptapContentError('Content is empty after sanitization');
  }

  return { type: 'doc', content };
}

// Flattens a Tiptap doc to plain text for search indexing / excerpts. Walks the AST
// and concatenates text nodes, space-joining block boundaries.
export function tiptapToPlainText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as TiptapNode;
    if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(doc);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
