# verify-email

## Overview

Server-rendered email verification result and recovery [page.tsx:VerifyEmailPage]

## Interface

- Default async VerifyEmailPage accepts promised searchParams [page.tsx:VerifyEmailPage]

## Invariants

- Only a string token is accepted; missing or failed token offers resend [page.tsx:VerifyEmailPage]

## Side Effects

- Posts token to /auth/verify-email with no-store caching [page.tsx:verifyEmailToken]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
