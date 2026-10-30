# auth

## Overview

Reusable authentication layout, branding, verification resend and feedback components.

## Interface

- Exports AuthShell, GoogleIcon, Logo, PasswordStrength, ResendVerificationForm, ResendVerification and StatusBanner [auth-shell.tsx:AuthShell] [google-icon.tsx:GoogleIcon] [logo.tsx:Logo] [password-strength.tsx:PasswordStrength] [resend-verification-form.tsx:ResendVerificationForm] [resend-verification.tsx:ResendVerification] [status-banner.tsx:StatusBanner].

## Invariants

- Password strength scores length, case, digit and symbol on four semantic bars [password-strength.tsx:getStrength] [password-strength.tsx:barClass].
- Resend exposes rate limiting but treats other failures like success; cooldown is at least 60 seconds and button returns after waiting [resend-verification.tsx:onResend] [resend-verification.tsx:COOLDOWN_SECONDS].

## Side Effects

- Resend calls auth API and maintains a cleaned-up countdown interval [resend-verification.tsx:ResendVerification].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
