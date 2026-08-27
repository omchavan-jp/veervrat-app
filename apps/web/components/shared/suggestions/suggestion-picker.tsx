'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { blockElementFor } from '@/lib/suggestions/anchor';

/**
 * Point at the thing you want to talk about.
 *
 * A full-screen catcher sits above the page and swallows the click, so entering suggestion mode
 * can never trigger the page underneath — clicking "Delete journey" to suggest better wording for
 * it would be an unforgivable way to lose data. The element beneath the cursor is found with
 * `elementFromPoint` after hiding the catcher for the duration of that one call.
 */
export function SuggestionPicker({
  onPick,
  onCancel,
}: {
  onPick: (el: Element) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('suggestions');
  const [box, setBox] = useState<DOMRect | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const catcher = useRef<HTMLDivElement>(null);
  const hovered = useRef<Element | null>(null);

  const elementUnder = (x: number, y: number): Element | null => {
    const node = catcher.current;
    if (!node) return null;
    // Hidden for exactly one hit-test, then restored. `visibility` rather than `display` so the
    // element keeps its box and nothing reflows.
    node.style.visibility = 'hidden';
    const found = document.elementFromPoint(x, y);
    node.style.visibility = 'visible';
    return found;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const found = elementUnder(e.clientX, e.clientY);
      if (!found || found === document.body || found === document.documentElement) {
        hovered.current = null;
        setBox(null);
        setLabel(null);
        return;
      }
      const block = blockElementFor(found);
      hovered.current = block;
      setBox(block.getBoundingClientRect());
      setLabel(block.getAttribute('data-suggest'));
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const found = elementUnder(e.clientX, e.clientY);
      if (found) onPick(blockElementFor(found));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    const node = catcher.current;
    node?.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      node?.removeEventListener('click', onClick);
    };
  }, [onPick, onCancel]);

  return (
    <>
      <div
        ref={catcher}
        role="application"
        aria-label={t('pickerAria')}
        className="fixed inset-0 z-[60] cursor-crosshair bg-black/10"
      />

      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[61] rounded-md border-2 border-accent bg-accent/10 transition-[top,left,width,height] duration-75"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        >
          {/* Flips below the element when there is no room above, so the hint is never clipped
              off the top of the viewport. */}
          <span
            className="absolute left-0 whitespace-nowrap rounded bg-accent px-2 py-0.5 font-mono text-[11px] text-bg"
            style={box.top > 28 ? { top: -24 } : { bottom: -24 }}
          >
            {label ?? t('pickerHint')}
          </span>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[62] flex justify-center">
        <p className="rounded-full bg-fg px-4 py-2 text-[13px] text-bg shadow-lg">
          {t('pickerPrompt')}
        </p>
      </div>
    </>
  );
}
