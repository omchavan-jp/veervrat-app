import { describe, it, expect, beforeEach } from 'vitest';
import { captureAnchor, blockElementFor } from '@/lib/suggestions/anchor';
import { resolveEntity, KNOWN_ENTITY_ROUTES } from '@/lib/suggestions/entity-registry';
import { routePattern } from '@/components/shared/suggestions/suggestion-mode';
import { textToDoc, docToText } from '@/lib/suggestions/body';

describe('captureAnchor — the four signals, ordered by durability', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('prefers an explicit data-suggest key, taken from the nearest ancestor that has one', () => {
    document.body.innerHTML = `
      <section data-suggest="weakness.description">
        <p id="target">Over laziness</p>
      </section>`;

    const anchor = captureAnchor(document.getElementById('target')!);

    expect(anchor.anchorKey).toBe('weakness.description');
  });

  it('records the visible text, collapsed — copy outlives markup, so it is the durable fallback', () => {
    document.body.innerHTML = `<p id="target">  Over    laziness\n  and delay </p>`;

    const anchor = captureAnchor(document.getElementById('target')!);

    expect(anchor.anchorText).toBe('Over laziness and delay');
  });

  it('truncates very long text rather than storing a page in a column', () => {
    document.body.innerHTML = `<p id="target">${'x'.repeat(500)}</p>`;

    const anchor = captureAnchor(document.getElementById('target')!);

    expect(anchor.anchorText!.length).toBeLessThanOrEqual(301);
    expect(anchor.anchorText!.endsWith('…')).toBe(true);
  });

  it('uses the element’s own id when it has one — nothing more precise exists', () => {
    document.body.innerHTML = `<div><main id="shell"><div><p id="target">hi</p></div></main></div>`;

    const anchor = captureAnchor(document.getElementById('target')!);

    expect(anchor.anchorPath).toBe('#target');
  });

  it('stops climbing at the nearest ancestor id, because nothing above a unique element helps', () => {
    document.body.innerHTML = `<div><main id="shell"><div><p>a</p><p class="t">hi</p></div></main></div>`;

    const anchor = captureAnchor(document.querySelector('.t')!);

    expect(anchor.anchorPath).toMatch(/^#shell>/);
    // Positional, because there are two siblings of the same tag and only position tells them
    // apart. This is exactly the signal that rots — hence its place last in the order.
    expect(anchor.anchorPath).toContain('p:nth(1)');
  });

  it('captures no key when nobody has added one — absence is not a failure', () => {
    document.body.innerHTML = `<p id="target">plain</p>`;

    const anchor = captureAnchor(document.getElementById('target')!);

    expect(anchor.anchorKey).toBeUndefined();
    expect(anchor.anchorText).toBe('plain');
  });
});

describe('blockElementFor — anchor the block, not the word', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Clicking a word inside a sentence should attach to the sentence. A <span> a highlight
  // happens to be wrapped in has no meaning of its own, and a suggestion attached to it says
  // nothing.
  it('walks up out of inline elements', () => {
    document.body.innerHTML = `<p id="para">Over <em id="word">laziness</em></p>`;

    const block = blockElementFor(document.getElementById('word')!);

    expect(block.id).toBe('para');
  });

  it('leaves a block element alone', () => {
    document.body.innerHTML = `<section id="s"><p>x</p></section>`;

    expect(blockElementFor(document.getElementById('s')!).id).toBe('s');
  });
});

describe('routePattern — the pattern, not the URL', () => {
  it('replaces param values with their names', () => {
    expect(routePattern('/weaknesses/abc-123', { id: 'abc-123' })).toBe('/weaknesses/[id]');
  });

  it('handles several params', () => {
    expect(routePattern('/study/w1/test/t2/report', { id: 'w1', testId: 't2' })).toBe(
      '/study/[id]/test/[testId]/report',
    );
  });

  // A short value that is a substring of a longer one would corrupt the pattern if replaced
  // first, so replacement runs longest-first.
  it('does not let a short param value corrupt a longer one', () => {
    expect(routePattern('/study/ab/test/abcdef', { id: 'ab', testId: 'abcdef' })).toBe(
      '/study/[id]/test/[testId]',
    );
  });

  it('leaves a static route untouched', () => {
    expect(routePattern('/pothi', {})).toBe('/pothi');
  });
});

describe('resolveEntity — which record this page is about', () => {
  it('resolves a known route', () => {
    expect(resolveEntity('/weaknesses/[id]', { id: 'w1' })).toEqual({
      entityType: 'weakness',
      entityId: 'w1',
    });
  });

  it('names the right param when the route has more than one', () => {
    expect(resolveEntity('/study/[id]/test/[testId]', { id: 'w1', testId: 't2' })).toEqual({
      entityType: 'test',
      entityId: 't2',
    });
  });

  // The rule that keeps coverage universal: an unregistered route still yields a suggestion.
  it('returns nothing for an unregistered route, rather than failing', () => {
    expect(resolveEntity('/some/new/[thing]', { thing: 'x' })).toEqual({});
  });

  it('returns nothing when the named param is absent', () => {
    expect(resolveEntity('/weaknesses/[id]', {})).toEqual({});
  });

  it('takes the first segment of a catch-all rather than stringifying the array', () => {
    expect(resolveEntity('/weaknesses/[id]', { id: ['w1', 'extra'] })).toEqual({
      entityType: 'weakness',
      entityId: 'w1',
    });
  });

  it('every registered route is a pattern, not a resolved path', () => {
    for (const route of KNOWN_ENTITY_ROUTES) {
      expect(route.startsWith('/'), route).toBe(true);
      expect(route, 'a registry entry with no [param] can never resolve an entity').toContain('[');
    }
  });
});

describe('body — plain text stored in the shape a rich editor will read', () => {
  it('round-trips', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    expect(docToText(textToDoc(text)!)).toBe(text);
  });

  it('produces a Tiptap document, so a later editor needs no migration', () => {
    const doc = textToDoc('hello')!;
    expect(doc.type).toBe('doc');
    expect(doc.content[0].type).toBe('paragraph');
    expect(doc.content[0].content![0]).toEqual({ type: 'text', text: 'hello' });
  });

  it('treats empty and whitespace-only as nothing at all', () => {
    expect(textToDoc('')).toBeUndefined();
    expect(textToDoc('   \n  ')).toBeUndefined();
  });

  it('tolerates anything that is not the shape we wrote', () => {
    expect(docToText(null)).toBe('');
    expect(docToText('a string')).toBe('');
    expect(docToText({ type: 'doc' })).toBe('');
  });
});
