## Why

The test report page's "Start journey" button already links to `/journeys/new?sentenceId=X` but gets a 404 — JourneysModule doesn't exist yet. Flow 1 (Study) is complete through the report; Flow 2 (Work) can't begin without journeys. Item 11 closes that gap and unblocks items 12-20.

## What Changes

- **Backend**: New `JourneysModule` — create, list, detail, pause/resume, and title-edit endpoints
- **Backend**: One-per-sentence enforcement at `POST /journeys` (active/paused/dormant journey blocks a new one for the same sentence)
- **Frontend**: `/journeys/new` redirect page — creates the journey and immediately redirects to `/journeys/[id]`
- **Frontend**: `/journeys` list page — own journeys with state badges
- **Frontend**: `/journeys/[id]` detail page — journey shell header + tab bar + Status Overview tab (E/R/C/Chat tabs are stubs for items 12-13 and 20)
- **Frontend**: "Start journey" link wired from test report — already uses the correct URL shape

## Capabilities

### New Capabilities
- `journey-create`: Create a journey from a sentence+weakness context; enforces one-non-completed-journey-per-sentence; sets ACTIVE state and startedAt immediately
- `journey-view`: List own journeys (VA) or assigned journeys (VM); view journey detail with sentence chain, weakness tags, VM, ERC counts
- `journey-state`: Pause (ACTIVE→PAUSED) and resume (PAUSED/DORMANT→ACTIVE) transitions; permission-gated to owning VA
- `journey-shell`: Frontend journey detail page — persistent header with inline title edit, state indicator, sentence context, tabs (Status Overview live; E/R/C/Chat stubbed)

### Modified Capabilities
- `study-nav`: Status Overview shows "Start journey" CTA on empty new journey — no separate spec change needed, just implementation gap closed

## Impact

**Backend — new files:**
- `apps/api/src/modules/journeys/journeys.module.ts`
- `apps/api/src/modules/journeys/journeys.controller.ts`
- `apps/api/src/modules/journeys/journeys.service.ts`
- `apps/api/src/modules/journeys/journeys.repository.ts`
- `apps/api/src/modules/journeys/dto/create-journey.dto.ts`
- `apps/api/src/modules/journeys/dto/update-journey-state.dto.ts`
- `apps/api/src/modules/journeys/dto/update-journey-title.dto.ts`
- `apps/api/src/modules/journeys/journeys.service.spec.ts`

**Backend — modified:**
- `apps/api/src/app.module.ts` — register JourneysModule

**Frontend — new files:**
- `apps/web/app/(app)/journeys/new/page.tsx`
- `apps/web/app/(app)/journeys/page.tsx`
- `apps/web/app/(app)/journeys/[id]/page.tsx`
- `apps/web/lib/api/journeys.ts`
- `apps/web/hooks/use-journeys.ts`
- `apps/web/src/test/journey-list.test.tsx`

**Frontend — modified:**
- `apps/web/lib/api/query-keys.ts` — journeys namespace already exists, no change needed
- `apps/web/messages/en.json` + `mr.json` — journey i18n keys

**No new dependencies. No DB migrations** — all journey tables already exist in schema.
