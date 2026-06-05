## Why

ERC items can currently only be moved to SUBMITTED by the VA; the REVISIT and VM-side APPROVED transitions are hard-blocked with a placeholder (item 15). Journey completion similarly lacks a submit/approve flow. This change closes both gaps so VMs can fulfil their review role.

## What Changes

- New VM-facing POST endpoints to approve or return-for-revisit each ERC type (exposure, resolution, challenge)
- VA self-approve path already exists for status `approved` when no VM is assigned; VM approve path is wired in the same way but via separate endpoints
- New VA-facing POST endpoint to submit journey completion (`/api/v1/journeys/:id/complete`)
- New VM-facing POST endpoint to approve journey completion (`/api/v1/journeys/:id/complete/approve`)
- VA self-approve journey completion path when no VM assigned
- Notification records written to DB on each approval/revisit event (5 notification types)
- Existing test `"NEGATIVE: REVISIT always throws AccessDenied"` in `erc.service.spec.ts` updated to pass

## Capabilities

### New Capabilities
- `erc-vm-approval`: VM approve/revisit endpoints for ERC items (exposures, resolutions, challenges)
- `journey-completion`: VA submit + VM approve journey completion flow

### Modified Capabilities
- `erc-status`: VA self-approve path clarified; REVISIT now enabled for VMs via separate endpoint (delta spec updates existing NEGATIVE scenario for REVISIT)

## Impact

- `apps/api/src/modules/erc/erc.service.ts` — new `approveItem` and `revisitItem` methods; remove REVISIT placeholder throw
- `apps/api/src/modules/erc/erc.controller.ts` — new POST routes for approve/revisit on each of the three ERC sub-controllers
- `apps/api/src/modules/journeys/journeys.service.ts` — new `submitCompletion` and `approveCompletion` methods
- `apps/api/src/modules/journeys/journeys.controller.ts` — new POST routes for complete and complete/approve
- `apps/api/src/modules/journeys/journeys.repository.ts` — new `setCompleted` method
- `apps/api/prisma/schema.prisma` — no schema changes needed (Notification model and NotificationEventType already have all required values)
- New `NotificationsRepository` in a thin `notifications` module for writing notification rows
- `apps/api/src/app.module.ts` — import NotificationsModule
- Tests: `erc.service.spec.ts` (update 1 test, add 6 new), `journeys.service.spec.ts` (add 6 new)
