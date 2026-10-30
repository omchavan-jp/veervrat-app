# confirm-email-change

## Overview

Token-based email-change confirmation with pending/success/failure display [apps/web/app/(public)/confirm-email-change/page.tsx:ConfirmEmailChangePage].

## Interface

- Default export ConfirmEmailChangePage reads token search parameter; internal classify maps TOKEN_INVALID, TOKEN_EXPIRED and DUPLICATE_ENTITY to distinct failures and other errors to unknown [apps/web/app/(public)/confirm-email-change/page.tsx:ConfirmEmailChangePage] [apps/web/app/(public)/confirm-email-change/page.tsx:classify].

## Invariants

- Missing token produces invalid failure without API call [apps/web/app/(public)/confirm-email-change/page.tsx:ConfirmEmailChangePage].

## Side Effects

- Calls authApi.confirmEmailChange(token) in effect on token change; success button pushes /dashboard and error UI links /settings [apps/web/app/(public)/confirm-email-change/page.tsx:ConfirmEmailChangePage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
