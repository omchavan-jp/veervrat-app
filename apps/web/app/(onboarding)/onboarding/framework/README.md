# framework

## Overview

Three-screen framework introduction ending in study/dashboard choices [apps/web/app/(onboarding)/onboarding/framework/page.tsx:FrameworkOnboardingPage] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:CtaScreen].

## Interface

- Default export FrameworkOnboardingPage; internal Section1, Section2 and CtaScreen receive translation and navigation callbacks [apps/web/app/(onboarding)/onboarding/framework/page.tsx:FrameworkOnboardingPage] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:Section1] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:Section2] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:CtaScreen].

## Invariants

- Content requires user with completed account setup and incomplete onboarding; otherwise shows spinner; CTA dashboard/back buttons disabled while completion pending [apps/web/app/(onboarding)/onboarding/framework/page.tsx:FrameworkOnboardingPage] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:CtaScreen].

## Side Effects

- Redirects complete users to /dashboard and missing-user/incomplete-account users to /onboarding/account-setup; CTA invokes useCompleteFramework mutation then pushes /study or /dashboard only on success [apps/web/app/(onboarding)/onboarding/framework/page.tsx:FrameworkOnboardingPage] [apps/web/app/(onboarding)/onboarding/framework/page.tsx:CtaScreen].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
