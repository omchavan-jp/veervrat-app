# dashboard

## Overview

Localized dashboard greeting, primary action, statistics and suggestions.

## Interface

- Exports DashboardGreeting, DashboardHero, DashboardPlatformStats, DashboardStatsBar and DashboardSuggestions [dashboard-greeting.tsx:DashboardGreeting] [dashboard-hero.tsx:DashboardHero] [dashboard-platform-stats.tsx:DashboardPlatformStats] [dashboard-stats-bar.tsx:DashboardStatsBar] [dashboard-suggestions.tsx:DashboardSuggestions].

## Invariants

- Hero selects most recently updated ACTIVE or NOT_STARTED journey, otherwise offers study [dashboard-hero.tsx:DashboardHero].
- Suggestions show at most three; platform statistics cache for 55 minutes and display nonpositive values as a dash [dashboard-suggestions.tsx:VISIBLE_LIMIT] [dashboard-platform-stats.tsx:STALE_TIME] [dashboard-platform-stats.tsx:DashboardPlatformStats].

## Side Effects

- Queries journey and dashboard APIs with retry controls for statistics and suggestions [dashboard-hero.tsx:DashboardHero] [dashboard-stats-bar.tsx:DashboardStatsBar] [dashboard-platform-stats.tsx:DashboardPlatformStats] [dashboard-suggestions.tsx:DashboardSuggestions].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
