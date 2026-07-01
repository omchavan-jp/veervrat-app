import { describe, it, expect } from 'vitest';
import { sanitizeTiptapDoc, InvalidTiptapContentError, tiptapToPlainText } from './sanitize';

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const para = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string) => ({ type: 'text', text: t });

describe('sanitizeTiptapDoc — structure', () => {
  it('rejects a non-doc payload', () => {
    expect(() => sanitizeTiptapDoc({ type: 'paragraph' })).toThrow(InvalidTiptapContentError);
  });

  it('rejects a payload that reduces to empty', () => {
    expect(() => sanitizeTiptapDoc(doc({ type: 'script' }))).toThrow(InvalidTiptapContentError);
  });

  it('keeps allowlisted text + marks', () => {
    const out = sanitizeTiptapDoc(
      doc(para({ type: 'text', text: 'hi', marks: [{ type: 'bold' }] })),
    );
    expect(out.content[0].content?.[0]).toEqual({
      type: 'text',
      text: 'hi',
      marks: [{ type: 'bold' }],
    });
  });

  it('drops disallowed marks but keeps the text', () => {
    const out = sanitizeTiptapDoc(
      doc(para({ type: 'text', text: 'hi', marks: [{ type: 'evil' }] })),
    );
    expect(out.content[0].content?.[0]).toEqual({ type: 'text', text: 'hi' });
  });
});

describe('sanitizeTiptapDoc — images', () => {
  it('keeps an image with a safe https URL', () => {
    const out = sanitizeTiptapDoc(
      doc(para(), { type: 'image', attrs: { src: 'https://cdn.example.com/a.png' } }),
    );
    expect(out.content.some((n) => n.type === 'image')).toBe(true);
  });

  it('drops an image with a javascript: URL', () => {
    const out = sanitizeTiptapDoc(
      doc(para(text('x')), { type: 'image', attrs: { src: 'javascript:alert(1)' } }),
    );
    expect(out.content.some((n) => n.type === 'image')).toBe(false);
  });
});

describe('sanitizeTiptapDoc — entity-reference (mention) nodes', () => {
  it('keeps a valid mention and strips unknown attrs', () => {
    const out = sanitizeTiptapDoc(
      doc(
        para({
          type: 'entityHash',
          attrs: { entityType: 'weakness', entityId: 'w-1', label: 'आळस', evil: '<script>' },
        }),
      ),
    );
    const mention = out.content[0].content?.[0];
    expect(mention?.type).toBe('entityHash');
    expect(mention?.attrs).toEqual({ entityType: 'weakness', entityId: 'w-1', label: 'आळस' });
    expect(mention?.attrs?.evil).toBeUndefined();
  });

  it('rejects a mention with an unknown entityType', () => {
    const out = sanitizeTiptapDoc(
      doc(
        para(text('hi'), {
          type: 'entityHash',
          attrs: { entityType: 'admin_panel', entityId: 'x', label: 'y' },
        }),
      ),
    );
    // mention dropped, text kept
    const kinds = out.content[0].content?.map((n) => n.type);
    expect(kinds).toEqual(['text']);
  });

  it('rejects a mention with a missing or oversized entityId', () => {
    const out = sanitizeTiptapDoc(
      doc(
        para(text('hi'), {
          type: 'entityHash',
          attrs: { entityType: 'weakness', entityId: 'x'.repeat(65), label: 'y' },
        }),
      ),
    );
    expect(out.content[0].content?.map((n) => n.type)).toEqual(['text']);
  });

  it('clamps an over-long label', () => {
    const out = sanitizeTiptapDoc(
      doc(
        para({
          type: 'entityHash',
          attrs: { entityType: 'virtue', entityId: 'v-1', label: 'a'.repeat(500) },
        }),
      ),
    );
    const label = out.content[0].content?.[0]?.attrs?.label as string;
    expect(label.length).toBe(120);
  });
});

describe('tiptapToPlainText', () => {
  it('flattens text nodes across blocks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'world' }] },
      ],
    };
    expect(tiptapToPlainText(doc)).toBe('Hello world');
  });

  it('returns empty string for empty/invalid input', () => {
    expect(tiptapToPlainText(null)).toBe('');
    expect(tiptapToPlainText({ type: 'doc', content: [] })).toBe('');
  });
});
