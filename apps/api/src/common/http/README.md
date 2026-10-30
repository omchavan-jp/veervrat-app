# http

## Overview

Centralizes auth cookie options and positive proxy-hop parsing. [cookie.ts:authCookieOptions] [trust-proxy.ts:resolveTrustProxyHops]

## Interface

- Local SameSiteMode type, cookieSameSite(), cookieDomain(), authCookieOptions({httpOnly,maxAgeMs?}) resolve environment-based scope/security options. [cookie.ts:SameSiteMode] [cookie.ts:cookieSameSite] [cookie.ts:cookieDomain] [cookie.ts:authCookieOptions]
- Local clearLegacyHostOnlyCookie(res,name) clears the cookie without domain when COOKIE_DOMAIN is configured. [cookie.ts:clearLegacyHostOnlyCookie]
- Local DEFAULT_TRUST_PROXY_HOPS=1 and resolveTrustProxyHops(raw,warn?) return positive integer hop counts or default. [trust-proxy.ts:DEFAULT_TRUST_PROXY_HOPS] [trust-proxy.ts:resolveTrustProxyHops]

## Invariants

- SameSite accepts only lax/strict/none, defaulting to none in production and lax otherwise; auth cookies use path / and production-only secure. [cookie.ts:cookieSameSite] [cookie.ts:authCookieOptions]
- Blank proxy values default silently; booleans, nonintegers and values below 1 default with warning. [trust-proxy.ts:resolveTrustProxyHops]

## Side Effects

- Legacy cleanup calls supplied res.clearCookie; invalid proxy input invokes supplied warning callback. [cookie.ts:clearLegacyHostOnlyCookie] [trust-proxy.ts:resolveTrustProxyHops]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
