# app

## Overview

Root error boundary and Google font configuration [error.tsx:ErrorBoundary] [fonts.ts:geistSans] Root layout, metadata, landing redirect, global error and not-found UI.

## Interface

- Default ErrorBoundary accepts error and reset; exports geistSans, geistMono, newsreader and tiroDevanagari [error.tsx:ErrorBoundary] [fonts.ts:geistSans] [fonts.ts:geistMono] [fonts.ts:newsreader] [fonts.ts:tiroDevanagari]
- Exports generateMetadata and RootLayout with request runtime configuration, locale and initial session user [layout.tsx:generateMetadata] [layout.tsx:RootLayout].
- RootPage redirects to login; NotFound offers dashboard and login links; GlobalError supplies its own HTML boundary [page.tsx:RootPage] [not-found.tsx:NotFound] [global-error.tsx:GlobalError].
- [(admin)](./%28admin%29/README.md): Wraps admin children with translation provider and shared authenticated app layout [apps/web/app/(admin)/layout.tsx:AdminLayout].
- [(app)](./%28app%29/README.md): Localized app layout and client authentication/onboarding guard around AppShell. [apps/web/app/(app)/layout.tsx:AppLayout] [apps/web/app/(app)/layout-client.tsx:AppLayoutClient]
- [(content)](./%28content%29/README.md): Content shell composes translated messages with authentication-dependent chrome. [apps/web/app/(content)/layout.tsx:ContentLayout] [apps/web/app/(content)/layout-client.tsx:ContentLayoutClient]
- [(moderation)](./%28moderation%29/README.md): Layout composes translation provider with imported shared AppLayoutClient. [apps/web/app/(moderation)/layout.tsx:ModerationLayout]
- [(onboarding)](./%28onboarding%29/README.md): Onboarding route-group internationalization wrapper [apps/web/app/(onboarding)/layout.tsx:OnboardingLayout].
- [(policy)](./%28policy%29/README.md): Policy route-group internationalization wrapper with no authentication redirect [apps/web/app/(policy)/layout.tsx:PolicyLayout].
- [(public)](./%28public%29/README.md): Public route-group internationalization wrapper with authenticated-user routing [apps/web/app/(public)/layout.tsx:PublicLayout] [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].
- [(vratmitra)](./%28vratmitra%29/README.md): Shared localized app layout for route group [(vratmitra)/layout.tsx:VratmitraLayout]
- [product-docs](./product-docs/README.md): Contains documented subdirectories.

## Invariants

- Metadata site URL is read at request time; locale defaults to en [layout.tsx:generateMetadata] [layout.tsx:RootLayout].

## Side Effects

- Captures errors in Sentry on effect and exposes reset button [error.tsx:ErrorBoundary]
- Reports root layout errors to Sentry [global-error.tsx:GlobalError].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
