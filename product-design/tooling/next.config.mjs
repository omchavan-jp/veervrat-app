import { createMDX } from 'fumadocs-mdx/next';
const withMDX = createMDX();

export default withMDX({
  reactStrictMode: true,
  basePath: '/product-docs',
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
});
