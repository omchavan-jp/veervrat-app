# login

## Overview

Client login form and account status notices [page.tsx:LoginPage]

## Interface

- Default LoginPage; accepts error, notice, deletedAt and returnTo search parameters [page.tsx:LoginPage]

## Invariants

- Login uses loginSchema and safeProductDocsReturnTo [page.tsx:LoginPage]
- Unverified email offers resend; rate limit errors receive localized retry messaging [page.tsx:LoginPage]

## Side Effects

- Submits login mutation and links to Google authentication [page.tsx:LoginPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
