import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Same-origin API proxy. The browser only ever talks to the web origin; Next.js
// forwards /api/v1/* to the API service. This keeps the session cookie
// first-party (the API's Set-Cookie returns through THIS origin), which is
// required because web and api are cross-site on *.up.railway.app and browsers
// block third-party cookies. API_ORIGIN is the API root (no /api/v1 suffix) and
// is read at build time — set it as a Railway build variable on the web service.
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + minimal node_modules) so the
  // Docker runtime image stays small and doesn't need a full workspace install.
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
