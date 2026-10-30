# experiences

## Overview

Personal experience list with draft, visibility, excerpt, edit, and confirmed delete UI. [apps/web/app/(app)/experiences/page.tsx:MyExperiencesPage]

## Interface

- Exports default MyExperiencesPage; queries experienceLogsApi.getMine with queryKeys.experiences.mine and displays loading, retryable error, empty, or item list states. [apps/web/app/(app)/experiences/page.tsx:MyExperiencesPage]
- VIS_ICON maps PUBLIC to Globe, FRIENDS to Users, and ONLY_ME to Lock. [apps/web/app/(app)/experiences/page.tsx:VIS_ICON]
- [\[id\]](./%5Bid%5D/README.md): Contains documented subdirectories.
- [new](./new/README.md): New experience editor entry point with optional journey context [apps/web/app/(app)/experiences/new/page.tsx:NewExperiencePage].

## Invariants

- Delete mutation is invoked only when pendingDeleteId is truthy in the confirmation button handler; mutation settlement closes the dialog. [apps/web/app/(app)/experiences/page.tsx:MyExperiencesPage]

## Side Effects

- Calls experienceLogsApi.remove; invalidates the personal experience query on success and emits a destructive error toast on failure. [apps/web/app/(app)/experiences/page.tsx:MyExperiencesPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
