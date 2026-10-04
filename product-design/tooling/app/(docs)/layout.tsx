import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '../../lib/source';

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return <DocsLayout tree={source.getPageTree()}>{children}</DocsLayout>;
}
