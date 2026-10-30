# my-vratmitras

## Overview

Assigned VM card list with profile, scope, assigned count, invitation and chat links. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:MyVratmitrasClient]

## Interface

- Exports MyVratmitrasClient; MyVratmitrasPage default export composes it and metadata title is My Vratmitras. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:MyVratmitrasClient] [apps/web/app/(app)/my-vratmitras/page.tsx:MyVratmitrasPage] [apps/web/app/(app)/my-vratmitras/page.tsx:metadata]
- Local VM interface contains id, displayName, username, avatarUrl, GLOBAL/JOURNEY scope, and assignedJourneys. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:VM]
- [\[vmId\]](./%5BvmId%5D/README.md): Contains documented subdirectories.

## Invariants

- Empty state renders only when not loading, no error, and no VMs; assigned count renders only for nonempty assignedJourneys. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:MyVratmitrasClient]

## Side Effects

- GETs /vm-relationships/my-vms using query key my-vms and 30000ms staleTime, defaulting absent data to an empty list. [apps/web/app/(app)/my-vratmitras/my-vratmitras-client.tsx:MyVratmitrasClient]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
