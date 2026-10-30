# web

## Overview

Web application ESLint configuration. Next.js, PostCSS and Vitest configuration plus request proxy.

## Interface

- Default ESLint config composes Next core-web-vitals and TypeScript presets [eslint.config.mjs:eslintConfig].
- Default Next config uses next-intl and standalone output; PostCSS config enables Tailwind; Vitest config uses React and jsdom [next.config.ts:nextConfig] [postcss.config.mjs:config] [vitest.config.ts:default].
- proxy and config export request middleware and route matcher [proxy.ts:proxy] [proxy.ts:config].
- [app](./app/README.md): Root error boundary and Google font configuration.
- [components](./components/README.md): Contains documented subdirectories.
- [hooks](./hooks/README.md): Client hooks for auth, consent, journeys, tests, weaknesses, debounce, and notifications.
- [i18n](./i18n/README.md): Server request locale and translated message resolution.
- [lib](./lib/README.md): Client-side age qualification helpers.

## Invariants

- Generated build paths and next-env.d.ts are ignored; react-hooks/set-state-in-effect is a warning [eslint.config.mjs:eslintConfig].
- Anonymous requests skip auth lookup; internal auth lookup falls back on failure but not 401, with a two-second timeout and one-minute cooldown [proxy.ts:resolveUser] [proxy.ts:askWhoThisIs] [proxy.ts:INTERNAL_TIMEOUT_MS] [proxy.ts:INTERNAL_COOLDOWN_MS].
- Product docs bypass proxy; locale favors signed-in user language, otherwise valid anonymous cookie or Accept-Language [proxy.ts:proxy] [proxy.ts:localeFrom].

## Side Effects

- Proxy fetches auth/me, forwards locale and encoded session user headers, sets anonymous locale cookie and logs first internal failure [proxy.ts:askWhoThisIs] [proxy.ts:proxy] [proxy.ts:noteInternalFailure].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
