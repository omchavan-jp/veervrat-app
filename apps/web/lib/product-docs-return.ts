export function safeProductDocsReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return null;
  try {
    const url = new URL(value, 'http://localhost');
    if (url.origin !== 'http://localhost') return null;
    if (url.pathname !== '/product-docs' && !url.pathname.startsWith('/product-docs/')) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
