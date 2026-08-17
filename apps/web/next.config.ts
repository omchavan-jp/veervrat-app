import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// No API proxy. The browser calls the api directly on its own hostname.
//
// The proxy that used to live here forwarded /api/v1/* to the api so that session cookies
// stayed first-party, which was necessary while web and api were cross-site on
// *.up.railway.app. Both tiers now share a registrable domain, so cookies work without it.
//
// It was actively harmful in two ways: Next bakes rewrite destinations into the build, so the
// promoted image sent prod's traffic to UAT's api (21_Infrastructure-Conventions §17); and
// Next rewrites do not forward WebSocket upgrades, which is why chat has never worked in
// production. Do not reintroduce it — put per-environment values in lib/runtime-config.ts.

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + minimal node_modules) so the
  // Docker runtime image stays small and doesn't need a full workspace install.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
