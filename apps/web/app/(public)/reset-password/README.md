# reset-password

## Overview

Password reset and expired-link recovery UI [page.tsx:ResetPasswordPage]

## Interface

- Default ResetPasswordPage reads token search parameter [page.tsx:ResetPasswordPage]

## Invariants

- Missing token and TOKEN_EXPIRED, TOKEN_INVALID or TOKEN_NOT_FOUND show expired state [page.tsx:ResetPasswordPage]
- Reset and recovery forms use their respective schemas [page.tsx:ResetPasswordPage] [page.tsx:ExpiredState]

## Side Effects

- Invokes reset password and forgot password mutations [page.tsx:ResetPasswordPage] [page.tsx:ExpiredState]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
