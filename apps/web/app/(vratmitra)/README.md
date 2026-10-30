# (vratmitra)

## Overview

Shared localized app layout for route group [layout.tsx:VratmitraLayout]

## Interface

- Default async VratmitraLayout accepts children [layout.tsx:VratmitraLayout]
- [vratmitra](./vratmitra/README.md): Contains documented subdirectories.

## Invariants

- Wraps children in NextIntlClientProvider and AppLayoutClient [layout.tsx:VratmitraLayout]
- Delegated AppLayoutClient renders null without an authenticated user or with incomplete onboarding [../(app)/layout-client.tsx:AppLayoutClient].

## Side Effects

- Loads messages via getMessages [layout.tsx:VratmitraLayout]
- Delegated AppLayoutClient invalidates auth.me on changed pathname, redirects unauthenticated users to /login and users with incomplete onboarding to /onboarding [../(app)/layout-client.tsx:AppLayoutClient].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
