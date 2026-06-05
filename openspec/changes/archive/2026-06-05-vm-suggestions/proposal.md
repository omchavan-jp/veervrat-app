## Why

VMs can suggest ERC items to VAs, but there is currently no backend mechanism to record those suggestions or surface them in the UI. Without sidenote persistence, VA cannot see the VM's reasoning and the suggest/unsuggest lifecycle has no authoritative state.

## What Changes

- **New endpoint**: `POST /api/v1/journeys/:id/exposures/:eid/suggest` — VM creates a `VmSidenote` on a journey ERC item
- **New endpoint**: `DELETE /api/v1/journeys/:id/exposures/:eid/suggest` — VM revokes sidenote; nullifies `acknowledgedAt` if VA had already acknowledged
- **New endpoint**: `POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge` — VA marks sidenote as acknowledged
- Same three endpoints for resolutions and challenges (9 total)
- `ErcRepository.listJourneyItems` and `findById` include `vmSidenote` in selects
- `VM_SUGGESTION_NEW` notification fires to VA on suggest; `VM_SUGGESTION_DISMISSED` fires to VA on unsuggest
- `erc.suggest` permission already implemented — no permission layer changes needed

## Capabilities

### New Capabilities

- `vm-erc-suggestions`: VM can suggest/unsuggest ERC items with a sidenote, VA can acknowledge sidenotes. Includes notification triggers and full lifecycle (suggest → acknowledge → unsuggest → nullify ack).

### Modified Capabilities

- `erc-select`: ERC item list/detail responses now include `vmSidenote` shape (new field on existing response — non-breaking addition).

## Impact

- **Backend files**: `erc.repository.ts`, `erc.service.ts`, `erc.controller.ts`, `erc.service.spec.ts`
- **No new modules or migrations** — `VmSidenote` table and all enum values (`ErcEntityType`, `VM_SUGGESTION_NEW`, `VM_SUGGESTION_DISMISSED`) already exist in schema
- **9 new endpoints** across 3 controllers (exposures, resolutions, challenges)
- `NotificationsRepository` already injected in `ErcService` — no module wiring changes
