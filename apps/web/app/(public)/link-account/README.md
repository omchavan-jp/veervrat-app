# link-account

## Overview

Password form for linking an account through useLinkGoogle [apps/web/app/(public)/link-account/page.tsx:LinkAccountPage].

## Interface

- Default export LinkAccountPage reads token search parameter; local Zod schema requires password string minimum length eight [apps/web/app/(public)/link-account/page.tsx:LinkAccountPage] [apps/web/app/(public)/link-account/page.tsx:schema].

## Invariants

- Missing token renders error instead of form; successful mutation renders null; TOKEN_INVALID and INVALID_CREDENTIALS get translated error messages [apps/web/app/(public)/link-account/page.tsx:LinkAccountPage].

## Side Effects

- Submits token and password through useLinkGoogle mutation [apps/web/app/(public)/link-account/page.tsx:LinkAccountPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
