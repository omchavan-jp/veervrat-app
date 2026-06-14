'use client';

import Link from 'next/link';
import Image from 'next/image';

// Minimal Tiptap document shape for chat messages (text + image + mention nodes).
export type TiptapMark = { type: string; attrs?: Record<string, unknown> };
export type TiptapNode = {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};
export type TiptapDoc = { type: 'doc'; content: TiptapNode[] };

// Maps an entity type to its in-app route (where one exists). Concept entities have no
// standalone page yet, so they render as non-navigating chips.
function entityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'journey':
      return `/journeys/${entityId}`;
    case 'weakness':
      return `/study/${entityId}`;
    default:
      return null;
  }
}

function EntityChip({ attrs }: { attrs: Record<string, unknown> }) {
  const entityType = String(attrs.entityType ?? '');
  const entityId = String(attrs.entityId ?? '');
  const label = String(attrs.label ?? '');
  const href = entityHref(entityType, entityId);
  // Use currentColor-derived styling so the chip stays legible on both the light
  // surface (received) and the accent bubble (own message) — a fixed accent color
  // would be invisible accent-on-accent.
  const className =
    'rounded-md bg-current/15 px-1 font-medium [text-decoration:underline] decoration-current/40 underline-offset-2';
  if (href) {
    return (
      <Link href={href} className={`${className} hover:decoration-current`}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}

function applyMarks(text: string, marks: TiptapMark[] | undefined, key: number) {
  let node: React.ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') node = <strong>{node}</strong>;
    else if (mark.type === 'italic') node = <em>{node}</em>;
    else if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
      node = (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline">
          {node}
        </a>
      );
    }
  }
  return <span key={key}>{node}</span>;
}

function renderNode(node: TiptapNode, key: number): React.ReactNode {
  if (node.type === 'text') {
    return applyMarks(node.text ?? '', node.marks, key);
  }
  if ((node.type === 'entityAt' || node.type === 'entityHash') && node.attrs) {
    return <EntityChip key={key} attrs={node.attrs} />;
  }
  if (node.type === 'hardBreak') {
    return <br key={key} />;
  }
  if (node.type === 'image' && typeof node.attrs?.src === 'string') {
    return (
      <Image
        key={key}
        src={node.attrs.src}
        alt=""
        width={240}
        height={240}
        className="mt-1 max-h-48 w-auto rounded-lg object-contain"
        unoptimized
      />
    );
  }
  const children = (node.content ?? []).map((child, i) => renderNode(child, i));
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="whitespace-pre-wrap break-words">
        {children}
      </p>
    );
  }
  // Unknown/structural wrappers (e.g. lists) — render children inline without an
  // invalid block element (a <div> inside <p> breaks hydration).
  return <span key={key}>{children}</span>;
}

export function MessageContent({ content }: { content: TiptapDoc | undefined }) {
  if (!content?.content) return null;
  return <>{content.content.map((node, i) => renderNode(node, i))}</>;
}
