# onboarding

## Overview

Authenticated onboarding shell with PreAppControls and index redirect [apps/web/app/(onboarding)/onboarding/layout.tsx:OnboardingSubLayout] [apps/web/app/(onboarding)/onboarding/page.tsx:OnboardingIndexPage].

## Interface

- Default OnboardingSubLayout accepts React children and renders PreAppControls showLogout; default OnboardingIndexPage redirects to account setup [apps/web/app/(onboarding)/onboarding/layout.tsx:OnboardingSubLayout] [apps/web/app/(onboarding)/onboarding/page.tsx:OnboardingIndexPage].
- [account-setup](./account-setup/README.md): Account setup form collects display name, username, EN/MR language and optional gender [apps/web/app/(onboarding)/onboarding/account-setup/page.tsx:AccountSetupPage].
- [framework](./framework/README.md): Three-screen framework introduction ending in study/dashboard choices [apps/web/app/(onboarding)/onboarding/framework/page.tsx:FrameworkOnboardingPage] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:CtaScreen].

## Invariants

- Shell renders null without authenticated user [apps/web/app/(onboarding)/onboarding/layout.tsx:OnboardingSubLayout].

## Side Effects

- Shell replaces route with /login when authentication is false; index redirects to /onboarding/account-setup [apps/web/app/(onboarding)/onboarding/layout.tsx:OnboardingSubLayout] [apps/web/app/(onboarding)/onboarding/page.tsx:OnboardingIndexPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
