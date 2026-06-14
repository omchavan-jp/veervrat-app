import { describe, it, expect } from 'vitest';
import { sanitizeChatContent, InvalidChatContentError } from './tiptap-content';

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const para = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string) => ({ type: 'text', text: t });

describe('sanitizeChatContent — structure', () => {
  it('rejects a non-doc payload', () => {
    expect(() => sanitizeChatContent({ type: 'paragraph' })).toThrow(InvalidChatContentError);
  });

  it('rejects a payload that reduces to empty', () => {
    expect(() => sanitizeChatContent(doc({ type: 'script' }))).toThrow(InvalidChatContentError);
  });

  it('keeps allowlisted text + marks', () => {
    const out = sanitizeChatContent(doc(para({ type: 'text', text: 'hi', marks: [{ type: 'bold' }] })));
    expect(out.content[0].content?.[0]).toEqual({ type: 'text', text: 'hi', marks: [{ type: 'bold' }] });
  });

  it('drops disallowed marks but keeps the text', () => {
    const out = sanitizeChatContent(doc(para({ type: 'text', text: 'hi', marks: [{ type: 'evil' }] })));
    expect(out.content[0].content?.[0]).toEqual({ type: 'text', text: 'hi' });
  });
});

describe('sanitizeChatContent — images', () => {
  it('keeps an image with a safe https URL', () => {
    const out = sanitizeChatContent(doc(para(), { type: 'image', attrs: { src: 'https://cdn.example.com/a.png' } }));
    expect(out.content.some((n) => n.type === 'image')).toBe(true);
  });

  it('drops an image with a javascript: URL', () => {
    const out = sanitizeChatContent(doc(para(text('x')), { type: 'image', attrs: { src: 'javascript:alert(1)' } }));
    expect(out.content.some((n) => n.type === 'image')).toBe(false);
  });
});

describe('sanitizeChatContent — entity-reference (mention) nodes', () => {
  it('keeps a valid mention and strips unknown attrs', () => {
    const out = sanitizeChatContent(
      doc(
        para(
          { type: 'mention', attrs: { entityType: 'weakness', entityId: 'w-1', label: 'आळस', evil: '<script>' } },
        ),
      ),
    );
    const mention = out.content[0].content?.[0];
    expect(mention?.type).toBe('mention');
    expect(mention?.attrs).toEqual({ entityType: 'weakness', entityId: 'w-1', label: 'आळस' });
    expect(mention?.attrs?.evil).toBeUndefined();
  });

  it('rejects a mention with an unknown entityType', () => {
    const out = sanitizeChatContent(
      doc(para(text('hi'), { type: 'mention', attrs: { entityType: 'admin_panel', entityId: 'x', label: 'y' } })),
    );
    // mention dropped, text kept
    const kinds = out.content[0].content?.map((n) => n.type);
    expect(kinds).toEqual(['text']);
  });

  it('rejects a mention with a missing or oversized entityId', () => {
    const out = sanitizeChatContent(
      doc(para(text('hi'), { type: 'mention', attrs: { entityType: 'weakness', entityId: 'x'.repeat(65), label: 'y' } })),
    );
    expect(out.content[0].content?.map((n) => n.type)).toEqual(['text']);
  });

  it('clamps an over-long label', () => {
    const out = sanitizeChatContent(
      doc(para({ type: 'mention', attrs: { entityType: 'virtue', entityId: 'v-1', label: 'a'.repeat(500) } })),
    );
    const label = out.content[0].content?.[0]?.attrs?.label as string;
    expect(label.length).toBe(120);
  });
});
