## Why

Resolutions are habit-based practices that require repeated logging over time. The "Log check-in" button is already visible on the Resolutions tab but is disabled — vratarthis (VAs) have no way to record whether they completed, partially completed, or missed a resolution instance. This is the missing piece that makes resolutions functionally different from exposures and challenges.

## What Changes

- Add `POST /api/v1/journeys/:id/resolutions/:rid/checkins` — logs a single check-in (done/partial/missed + optional note) for an in-progress resolution
- Add `GET /api/v1/journeys/:id/resolutions/:rid/checkins` — returns the full check-in history with streak count
- Add `ResolutionCheckinsController`, `ResolutionCheckinsService`, `ResolutionCheckinsRepository` in a new `resolution-checkins` module (or extend `erc` module — see design)
- Frontend: replace the disabled "Log check-in" stub with an inline form (status selector + note textarea + submit) on the resolution card
- Frontend: expandable check-in history list below each resolution card
- Frontend: streak count badge on active/submitted resolution cards

## Capabilities

### New Capabilities

- `resolution-checkins`: POST + GET endpoints for resolution check-in logging; streak calculation (consecutive trailing `done` submissions, gaps do not break streak); frontend inline form, history list, streak display

### Modified Capabilities

_(none — no existing spec-level behavior changes; resolutions tab UI extends existing ERC item card pattern)_

## Impact

- **Backend**: New controller added to `ErcModule` (or new `ResolutionCheckinsModule`); new service + repository; no schema migration needed — `ResolutionCheckin` model and `CheckinStatus` enum already exist in `schema.prisma`
- **Frontend**: `resolutions-tab.tsx` stub replaced; `erc-item-card.tsx` extended for resolution-specific check-in UI; new API function + query key + hook added to `lib/api/journeys.ts`, `lib/api/query-keys.ts`, `hooks/use-journeys.ts`
- **No new dependencies** — existing patterns and libraries cover all requirements
- **No DB migration** — `resolution_checkins` table and `checkin_status` enum already in schema
