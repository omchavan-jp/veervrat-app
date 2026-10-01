import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';

const withMDX = createMDX();

export default withMDX({
  reactStrictMode: true,
  basePath: '/product-docs',
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
});
