'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquareText } from 'lucide-react';
import type { ContentSuggestion } from '@/lib/api/content-suggestions';

/**
 * Your own suggestions, marked where you left them.
 *
 * This is the detail that makes someone leave twenty suggestions instead of two: the page
 * visibly accumulates their thinking, rather than swallowing each one into a list they have to
 * go and find.
 *
 * ⚠️ Resolution is best-effort **by design**. `anchorKey` is exact where it exists; text matching
 * is a fallback that finds the element again after markup has changed. A pin that cannot be
 * placed is simply not drawn — the suggestion is still in the author's list, and pretending to
 * know where it belongs would be worse than admitting we don't.
 */
function locate(s: ContentSuggestion): Element | null {
  if (s.anchorKey) {
    const byKey = document.querySelector(`[data-suggest="${CSS.escape(s.anchorKey)}"]`);
    if (byKey) return byKey;
  }
  if (s.anchorText) {
    // Cheap and good enough: the first block whose rendered text starts the same way. Deliberately
    // not the DOM path — that rots, and a pin drawn in the wrong place is worse than none.
    const candidates = document.querySelectorAll(
      'main p, main h1, main h2, main h3, main li, main section, main div',
    );
    const needle = s.anchorText.slice(0, 60);
    for (const el of Array.from(candidates)) {
      const text = (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim() ?? '';
      if (text && text.startsWith(needle)) return el;
    }
  }
  return null;
}

export function SuggestionPins({ suggestions }: { suggestions: ContentSuggestion[] }) {
  const t = useTranslations('suggestions');
  const [placed, setPlaced] = useState<{ s: ContentSuggestion; rect: DOMRect }[]>([]);

  useEffect(() => {
    const place = () => {
      setPlaced(
        suggestions
          .map((s) => {
            const el = locate(s);
            return el ? { s, rect: el.getBoundingClientRect() } : null;
          })
          .filter((x): x is { s: ContentSuggestion; rect: DOMRect } => x !== null),
      );
    };

    // Re-placed after paint, and again on scroll and resize, because the rects are viewport
    // coordinates. A frame's delay lets the page finish rendering before we measure it.
    const id = window.requestAnimationFrame(place);
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [suggestions]);

  return (
    <>
      {placed.map(({ s, rect }) => (
        <div
          key={s.id}
          className="pointer-events-none fixed z-40"
          style={{ top: rect.top + 4, left: Math.max(rect.left - 26, 4) }}
        >
          <span
            title={`${s.titleEn}${s.status !== 'NEW' ? ` — ${t(`status.${s.status}`)}` : ''}`}
            className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent-2 text-bg shadow"
          >
            <MessageSquareText className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{s.titleEn}</span>
          </span>
        </div>
      ))}
    </>
  );
}
