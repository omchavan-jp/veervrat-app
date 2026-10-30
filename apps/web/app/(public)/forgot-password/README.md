# forgot-password

## Overview

Password recovery form and response-specific confirmation UI [apps/web/app/(public)/forgot-password/page.tsx:ForgotPasswordPage].

## Interface

- Default export ForgotPasswordPage uses forgotPasswordSchema resolver and useForgotPassword hook; no_account offers signup, set_password_sent and remaining success states show distinct messages [apps/web/app/(public)/forgot-password/page.tsx:ForgotPasswordPage].

## Invariants

- No explicit invariants identified.

## Side Effects

- Submits email through useForgotPassword mutation [apps/web/app/(public)/forgot-password/page.tsx:ForgotPasswordPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
