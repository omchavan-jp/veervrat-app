# (app)

## Overview

Localized app layout and client authentication/onboarding guard around AppShell. [apps/web/app/(app)/layout.tsx:AppLayout] [apps/web/app/(app)/layout-client.tsx:AppLayoutClient]

## Interface

- Exports default async AppLayout accepting React children, obtains getMessages and wraps children in NextIntlClientProvider and AppLayoutClient. [apps/web/app/(app)/layout.tsx:AppLayout]
- Exports AppLayoutClient accepting React children and rendering AppShell with authenticated user. [apps/web/app/(app)/layout-client.tsx:AppLayoutClient]
- [actions](./actions/README.md): Action inbox displaying ERC revisit items, suggestions awaiting decisions, pending VM approvals, new ERC availability and journey closure items [apps/web/app/(app)/actions/page.tsx:ActionsPage].
- [blogs](./blogs/README.md): Contains documented subdirectories.
- [dashboard](./dashboard/README.md): Composes dashboard greeting, personal stats, hero, suggestions and platform stats with Gregorian and Indian calendar dates [apps/web/app/(app)/dashboard/page.tsx:DashboardPage].
- [experiences](./experiences/README.md): Personal experience list with draft, visibility, excerpt, edit, and confirmed delete UI. [apps/web/app/(app)/experiences/page.tsx:MyExperiencesPage]
- [invitations](./invitations/README.md): Invitation search, sending, received invitation composition, reminder, cancel, and share UI. [apps/web/app/(app)/invitations/page.tsx:InvitationsPage]
- [journeys](./journeys/README.md): Journey listing with localized sentence/weakness content, state styling, and updated dates. [apps/web/app/(app)/journeys/page.tsx:JourneysPage]
- [my-vratmitras](./my-vratmitras/README.md): Assigned VM card list with profile, scope, assigned count, invitation and chat links. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:MyVratmitrasClient]
- [profile](./profile/README.md): Client page for the current account profile and profile visibility controls. [apps/web/app/(app)/profile/page.tsx:ProfilePage]
- [settings](./settings/README.md): Client settings page combining profile, privacy, language, notifications, global vratmitra, export, and account management sections. [apps/web/app/(app)/settings/page.tsx:SettingsPage]
- [study](./study/README.md): Client weakness browser grouped by returned clusters. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage]
- [suggestions](./suggestions/README.md): Suggestion history page and client list renderer. [apps/web/app/(app)/suggestions/page.tsx:MySuggestionsPage] [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient]
- [u](./u/README.md): Contains documented subdirectories.

## Invariants

- Client returns null when unauthenticated, user is absent, or onboardingCompletedAt is null; redirect effect uses if/else-if for login and onboarding. [apps/web/app/(app)/layout-client.tsx:AppLayoutClient]

## Side Effects

- Path changes invalidate queryKeys.auth.me, skipping the initial unchanged pathname; unauthenticated users replace to /login and authenticated users with incomplete onboarding replace to /onboarding. [apps/web/app/(app)/layout-client.tsx:AppLayoutClient]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
