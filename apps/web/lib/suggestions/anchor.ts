/**
 * Where on the page a suggestion was placed.
 *
 * Four signals, ordered by how well they survive the page changing. A reader resolves an anchor
 * by trying them in this order:
 *
 *   1. `anchorKey`  — `data-suggest="weakness.description"`. Survives everything, and exists only
 *                     where someone has added it. Phase 3 adds them where suggestions land.
 *   2. entity+route — handled by the caller, not here. Survives everything.
 *   3. `anchorText` — the visible text of the element. Survives most refactors, because copy
 *                     outlives markup.
 *   4. `anchorPath` — a positional path. Rots the first time a wrapper div appears.
 *
 * `anchorPath` is captured because it is free and sometimes exact. **Nothing may be built that
 * assumes it resolves.** It is a hint for a human, not an address.
 */

const TEXT_MAX = 300;
const PATH_MAX = 1000;

export type Anchor = {
  anchorKey?: string;
  anchorText?: string;
  anchorPath?: string;
  viewport: string;
};

/** The nearest ancestor (or self) carrying an explicit, durable anchor. */
function findKey(el: Element): string | undefined {
  const withKey = el.closest('[data-suggest]');
  return withKey?.getAttribute('data-suggest') ?? undefined;
}

/**
 * The element's visible text, collapsed and trimmed.
 *
 * `textContent` includes text hidden by CSS and swallows the whitespace that separates words in
 * the markup, so a heading and its body can run together. `innerText` reflects what is actually
 * rendered, which is what makes this a durable re-locator; it is only available on HTMLElement.
 */
function findText(el: Element): string | undefined {
  // `innerText` where it exists, `textContent` otherwise. The fallback is not only for jsdom:
  // `innerText` is undefined on SVG and other non-HTML elements, and returning nothing there
  // would silently drop the most durable signal we have.
  const rendered =
    el instanceof HTMLElement && typeof el.innerText === 'string' ? el.innerText : el.textContent;
  const text = (rendered ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX)}…` : text;
}

/**
 * A positional path from the body, preferring a stable id where one exists.
 *
 * Deliberately NOT a CSS selector built from class names: this codebase styles with Tailwind, so
 * a class list is a description of appearance and changes whenever the design does.
 */
function findPath(el: Element): string | undefined {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node !== document.body && parts.length < 20) {
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break; // an id is unique; nothing above it adds information
    }
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    const index = siblings.indexOf(node);
    parts.unshift(
      siblings.length > 1
        ? `${node.tagName.toLowerCase()}:nth(${index})`
        : node.tagName.toLowerCase(),
    );
    node = parent;
  }

  const path = parts.join('>');
  if (!path) return undefined;
  return path.length > PATH_MAX ? path.slice(0, PATH_MAX) : path;
}

export function captureAnchor(el: Element): Anchor {
  return {
    anchorKey: findKey(el),
    anchorText: findText(el),
    anchorPath: findPath(el),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/**
 * The block-level element a click should attach to.
 *
 * Clicking a word inside a paragraph should anchor the paragraph, not the `<span>` a highlight
 * happens to be wrapped in — otherwise the suggestion is attached to something with no meaning of
 * its own. Walks up until it finds an element that occupies its own line, and never past `main`.
 */
const INLINE = new Set(['SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'SMALL', 'CODE', 'MARK', 'A']);

export function blockElementFor(target: Element): Element {
  let el: Element | null = target;
  while (el && INLINE.has(el.tagName) && el.parentElement) {
    el = el.parentElement;
  }
  return el ?? target;
}
