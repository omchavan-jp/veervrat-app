# (public)

## Overview

Public route-group internationalization wrapper with authenticated-user routing [apps/web/app/(public)/layout.tsx:PublicLayout] [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].

## Interface

- Default async PublicLayout accepts React children and nests PublicLayoutClient within NextIntlClientProvider using getMessages; named export PublicLayoutClient accepts React children [apps/web/app/(public)/layout.tsx:PublicLayout] [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].
- [confirm-email-change](./confirm-email-change/README.md): Token-based email-change confirmation with pending/success/failure display [apps/web/app/(public)/confirm-email-change/page.tsx:ConfirmEmailChangePage].
- [forgot-password](./forgot-password/README.md): Password recovery form and response-specific confirmation UI [apps/web/app/(public)/forgot-password/page.tsx:ForgotPasswordPage].
- [invitations](./invitations/README.md): Contains documented subdirectories.
- [link-account](./link-account/README.md): Password form for linking an account through useLinkGoogle [apps/web/app/(public)/link-account/page.tsx:LinkAccountPage].
- [login](./login/README.md): Client login form and account status notices.
- [reset-password](./reset-password/README.md): Password reset and expired-link recovery UI.
- [set-password](./set-password/README.md): Reuses reset password page.
- [signup](./signup/README.md): Client signup form with email and Google paths.
- [verify-email](./verify-email/README.md): Server-rendered email verification result and recovery.

## Invariants

- Truthy token search parameter exempts authenticated visitors from redirect/render suppression; authenticated visitors without token render null [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].

## Side Effects

- Authenticated user without token redirects to /dashboard if onboardingCompletedAt truthy, otherwise /onboarding [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
