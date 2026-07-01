import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + minimal node_modules) so the
  // Docker runtime image stays small and doesn't need a full workspace install.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
