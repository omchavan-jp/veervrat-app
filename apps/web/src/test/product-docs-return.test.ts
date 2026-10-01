import { describe, expect, it } from 'vitest';
import { safeProductDocsReturnTo } from '../../lib/product-docs-return';

describe('product docs login return path', () => {
  it('accepts only a same-origin product-docs path', () => {
    expect(safeProductDocsReturnTo('/product-docs/01-product-model?tab=a')).toBe(
      '/product-docs/01-product-model?tab=a',
    );
    expect(safeProductDocsReturnTo('/product-docs')).toBe('/product-docs');
    expect(safeProductDocsReturnTo('//evil.example/product-docs')).toBeNull();
    expect(safeProductDocsReturnTo('/product-docs-evil')).toBeNull();
    expect(safeProductDocsReturnTo('/product-docs\\evil.example')).toBeNull();
    expect(safeProductDocsReturnTo('https://evil.example/product-docs')).toBeNull();
  });
});
