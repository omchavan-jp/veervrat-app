# dashboard

## Overview

Composes dashboard greeting, personal stats, hero, suggestions and platform stats with Gregorian and Indian calendar dates [apps/web/app/(app)/dashboard/page.tsx:DashboardPage].

## Interface

- Default async DashboardPage uses dashboard translations and locale; composes DashboardGreeting, DashboardStatsBar, DashboardHero, DashboardSuggestions and DashboardPlatformStats [apps/web/app/(app)/dashboard/page.tsx:DashboardPage].

## Invariants

- Locale mr selects mr-IN Gregorian formatting and mr-IN-u-ca-indian-nu-deva Indian calendar formatting; other locales use en-IN and en-IN-u-ca-indian; Indian calendar parts are interpolated through sakaDate translation [apps/web/app/(app)/dashboard/page.tsx:DashboardPage].

## Side Effects

- No explicit side effects identified.

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
