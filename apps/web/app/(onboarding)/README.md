# (onboarding)

## Overview

Onboarding route-group internationalization wrapper [apps/web/app/(onboarding)/layout.tsx:OnboardingLayout].

## Interface

- Default async OnboardingLayout accepts React children and wraps them in NextIntlClientProvider with getMessages() [apps/web/app/(onboarding)/layout.tsx:OnboardingLayout].
- [onboarding](./onboarding/README.md): Authenticated onboarding shell with PreAppControls and index redirect [apps/web/app/(onboarding)/onboarding/layout.tsx:OnboardingSubLayout] [apps/web/app/(onboarding)/onboarding/page.tsx:OnboardingIndexPage].

## Invariants

- No explicit invariants identified.

## Side Effects

- No explicit side effects identified.

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
