export function documentHref(href: string | undefined, pageUrl: string): string | undefined {
  if (!href || !/^\.{1,2}\//.test(href)) return href;

  // MDX links are relative to the source file, not the exported page directory.
  const documentUrl = pageUrl.replace(/\/+$/, '') || '/';
  const target = new URL(href, `https://docs.internal/product-docs${documentUrl}`);
  target.pathname = target.pathname.replace(/\.mdx$/, '');
  return target.pathname + target.search + target.hash;
}
