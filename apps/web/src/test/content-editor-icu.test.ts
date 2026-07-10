import { describe, it, expect } from 'vitest';
import { extractPlaceholders, placeholdersEqual } from '@/lib/content-editor/icu';

describe('content-editor icu util', () => {
  it('extracts simple placeholders', () => {
    expect(extractPlaceholders('Hello {name}, you have {count} items')).toEqual(['count', 'name']);
  });

  it('extracts the leading argument of plural/select forms', () => {
    expect(extractPlaceholders('{count, plural, one {# item} other {# items}}')).toEqual(['count']);
  });

  it('treats messages with no arguments as empty', () => {
    expect(extractPlaceholders('Just some text')).toEqual([]);
  });

  it('is equal when the same arguments are present regardless of surrounding text', () => {
    expect(placeholdersEqual('Hello {name}', 'Hi {name}!')).toBe(true);
  });

  it('is not equal when an argument is dropped', () => {
    expect(placeholdersEqual('Hello {name}', 'Hello there')).toBe(false);
  });
});
