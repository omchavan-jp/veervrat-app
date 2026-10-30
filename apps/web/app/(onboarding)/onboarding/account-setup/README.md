# account-setup

## Overview

Account setup form collects display name, username, EN/MR language and optional gender [apps/web/app/(onboarding)/onboarding/account-setup/page.tsx:AccountSetupPage].

## Interface

- Default export AccountSetupPage uses accountSetupSchema resolver and useCompleteOnboarding [apps/web/app/(onboarding)/onboarding/account-setup/page.tsx:AccountSetupPage].

## Invariants

- Submit blocked for taken, invalid or checking username; own username treated available and strings shorter than three skip availability request; other gender is trimmed custom text or undefined [apps/web/app/(onboarding)/onboarding/account-setup/page.tsx:AccountSetupPage].

## Side Effects

- Resets form from user; redirects fully onboarded users to /dashboard and account-setup-complete users to /onboarding/framework, except after successful mutation; debounces authApi.checkUsername by 400ms and clears pending timers; submits fields through useCompleteOnboarding and maps 409 to username error [apps/web/app/(onboarding)/onboarding/account-setup/page.tsx:AccountSetupPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
