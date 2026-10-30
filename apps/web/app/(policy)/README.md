# (policy)

## Overview

Policy route-group internationalization wrapper with no authentication redirect [apps/web/app/(policy)/layout.tsx:PolicyLayout].

## Interface

- Default async PolicyLayout accepts React children and provides getMessages() through NextIntlClientProvider [apps/web/app/(policy)/layout.tsx:PolicyLayout].
- [privacy](./privacy/README.md): Privacy Policy page delegates rendering to PolicyDocument [apps/web/app/(policy)/privacy/page.tsx:PrivacyPage].
- [terms](./terms/README.md): Terms of Use page delegates rendering to PolicyDocument [apps/web/app/(policy)/terms/page.tsx:TermsPage].

## Invariants

- No explicit invariants identified.

## Side Effects

- No explicit side effects identified.

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
