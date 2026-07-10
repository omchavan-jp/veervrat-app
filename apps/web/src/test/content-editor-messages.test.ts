import { describe, it, expect } from 'vitest';
import {
  flattenMessages,
  buildValueIndex,
  findKeysByText,
  applyOverrides,
} from '@/lib/content-editor/messages';

describe('content-editor messages util', () => {
  const nested = {
    feedback: { buttonLabel: 'Feedback', title: 'Raise' },
    common: { save: 'Save', dup: 'Feedback' },
  };

  it('flattens nested messages to dotted keys', () => {
    expect(flattenMessages(nested)).toEqual({
      'feedback.buttonLabel': 'Feedback',
      'feedback.title': 'Raise',
      'common.save': 'Save',
      'common.dup': 'Feedback',
    });
  });

  it('reverse-looks-up a unique value to exactly one key', () => {
    const index = buildValueIndex(flattenMessages(nested));
    expect(findKeysByText(index, 'Save')).toEqual(['common.save']);
  });

  it('returns multiple keys for an ambiguous value', () => {
    const index = buildValueIndex(flattenMessages(nested));
    expect(findKeysByText(index, 'Feedback').sort()).toEqual([
      'common.dup',
      'feedback.buttonLabel',
    ]);
  });

  it('returns no keys for unknown text', () => {
    const index = buildValueIndex(flattenMessages(nested));
    expect(findKeysByText(index, 'Nope')).toEqual([]);
  });

  it('applies a dotted override without mutating the base or reordering keys', () => {
    const base = { feedback: { buttonLabel: 'Feedback', title: 'Raise' } };
    const result = applyOverrides(base, { 'feedback.buttonLabel': 'Abhipray' });

    const fb = result['feedback'];
    expect(typeof fb).toBe('object');
    if (typeof fb === 'object') {
      expect(Object.keys(fb)).toEqual(['buttonLabel', 'title']);
      expect(fb['buttonLabel']).toBe('Abhipray');
      expect(fb['title']).toBe('Raise');
    }
    // base is untouched
    expect(flattenMessages(base)['feedback.buttonLabel']).toBe('Feedback');
  });

  it('creates intermediate objects for a genuinely new key', () => {
    expect(applyOverrides({}, { 'a.b.c': 'X' })).toEqual({ a: { b: { c: 'X' } } });
  });
});
