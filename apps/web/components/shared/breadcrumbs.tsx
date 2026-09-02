'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ContentText } from '@/components/shared/bilingual-text';

/**
 * Where you are, and every way back — in one form, in one place.
 *
 * Four pages in the virtue drill-down each built their own back link, and no two were the same:
 * two used an `<ArrowLeft/>` icon and two a literal `←` character; two pointed at the parent entity
 * and two at the top-level list; and none showed more than one level, so reaching a virtue from a
 * sentence took two hops through a page nobody wanted (#33).
 *
 * ⚠️ **Built from the ancestry the page already has, never from where the person came from.** A
 * history-based trail produces a path rather than a position, and it is empty exactly when somebody
 * needs it most — arriving from a link, a bookmark, or a new tab. The same reasoning retired
 * `?next=` in #208.
 *
 * ⚠️ **Not every page has an ancestry, and one of them looks as though it does.** A weakness maps
 * to MANY subvirtues (`WeaknessSubvirtue` is a join table), so it has no single parent and must not
 * be given crumbs — see `BackLink` below, which is what that page uses instead.
 */
export type Crumb = {
  href: string;
  /** Entity names are bilingual, so both are carried and the renderer picks. */
  en: string;
  mr?: string | null;
};

export function Breadcrumbs({
  crumbs,
  current,
  label,
}: {
  crumbs: Crumb[];
  /** The page itself. Rendered, never linked — you are already here. */
  current: { en: string; mr?: string | null };
  /** Names the landmark for a screen reader, e.g. "Breadcrumb". */
  label: string;
}) {
  return (
    <nav aria-label={label} className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            <Link href={c.href} className="hover:text-accent">
              <ContentText en={c.en} mr={c.mr} />
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          </li>
        ))}
        <li aria-current="page" className="text-fg">
          <ContentText en={current.en} mr={current.mr} />
        </li>
      </ol>
    </nav>
  );
}

/**
 * The way back for a page with no ancestry to show.
 *
 * Exists so that a page without a hierarchy still uses the shared affordance rather than growing a
 * fifth hand-built variant. `/weaknesses/[id]` is the case this was written for: it belongs to
 * several subvirtues, so it returns to the browser rather than claiming a parent it does not have.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-accent"
    >
      <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
      {label}
    </Link>
  );
}
