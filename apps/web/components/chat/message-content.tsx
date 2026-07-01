'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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

// Defense-in-depth: only allow safe link schemes to reach the rendered anchor, so a
// stored javascript:/data: href can never execute even if server sanitization lapses.
function safeHref(href: string): string | null {
  try {
    const url = new URL(href, 'https://veervrat.local');
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return href;
    }
    return null;
  } catch {
    return null;
  }
}

function applyMarks(text: string, marks: TiptapMark[] | undefined, key: number) {
  let node: React.ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') node = <strong>{node}</strong>;
    else if (mark.type === 'italic') node = <em>{node}</em>;
    else if (mark.type === 'link') {
      const raw = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
      const href = safeHref(raw);
      // Disallowed scheme: fall back to plain text rather than rendering the anchor.
      node = href ? (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline">
          {node}
        </a>
      ) : (
        node
      );
    }
  }
  return <span key={key}>{node}</span>;
}

function renderNode(node: TiptapNode, key: number, imageAlt: string): React.ReactNode {
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
    // A shared image is meaningful content, not decorative: prefer an author-supplied
    // alt, otherwise a localized generic description.
    const alt = typeof node.attrs.alt === 'string' && node.attrs.alt ? node.attrs.alt : imageAlt;
    return (
      <Image
        key={key}
        src={node.attrs.src}
        alt={alt}
        width={240}
        height={240}
        className="mt-1 max-h-48 w-auto rounded-lg object-contain"
        unoptimized
      />
    );
  }
  const children = (node.content ?? []).map((child, i) => renderNode(child, i, imageAlt));
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="whitespace-pre-wrap break-words">
        {children}
      </p>
    );
  }
  if (node.type === 'bulletList') {
    return (
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-5">
        {children}
      </ul>
    );
  }
  if (node.type === 'orderedList') {
    return (
      <ol key={key} className="my-1 list-decimal space-y-0.5 pl-5">
        {children}
      </ol>
    );
  }
  if (node.type === 'listItem') {
    return <li key={key}>{children}</li>;
  }
  if (node.type === 'blockquote') {
    return (
      <blockquote key={key} className="my-1 border-l-2 border-border pl-3 text-muted">
        {children}
      </blockquote>
    );
  }
  // Unknown/structural wrappers — render children inline without an invalid block
  // element (a <div> inside <p> breaks hydration).
  return <span key={key}>{children}</span>;
}

export function MessageContent({ content }: { content: TiptapDoc | undefined }) {
  const t = useTranslations('chat');
  if (!content?.content) return null;
  const imageAlt = t('image_alt');
  return <>{content.content.map((node, i) => renderNode(node, i, imageAlt))}</>;
}
