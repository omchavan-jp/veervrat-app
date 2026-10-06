import { notFound } from 'next/navigation';
import type { ComponentProps } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { D2Diagram } from '../../components/d2-diagram';
import { source } from '../../../lib/source';

function documentHref(href: string | undefined, pageUrl: string): string | undefined {
  if (!href || !/^\.{1,2}\//.test(href) || !href.split(/[?#]/, 1)[0].endsWith('.mdx')) return href;
  const target = new URL(href, `https://docs.internal/product-docs${pageUrl}`);
  target.pathname = target.pathname.replace(/\.mdx$/, '');
  return target.pathname + target.search + target.hash;
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const mdxComponents = {
    ...defaultMdxComponents,
    D2Diagram,
    a: (props: ComponentProps<'a'>) => <a {...props} href={documentHref(props.href, page.url)} />,
  };
  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams();
}
