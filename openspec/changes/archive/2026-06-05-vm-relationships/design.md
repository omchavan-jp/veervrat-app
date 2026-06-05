## Context

The schema already has all required models: `Invitation`, `VmRelationship` (global), `JourneyVmAssignment` (journey-level). The `hasPermission` function already handles all four invitation permission actions and `vm_relationship.withdraw`. `JourneysRepository.findById` already fetches `globalVmRelationship` and `buildJourneySlim` already populates it. No schema migration is needed — this is purely a new module layer.

Current state: `Invitation` rows and `VmRelationship` rows can exist but there is no module to create or manage them.

## Goals / Non-Goals

**Goals:**
- `InvitationsModule`: send VM invitations (global or journey-scoped), token-based accept/decline, cancel pending invites, list own invitations
- `VmRelationshipsModule`: create relationship on invitation accept, remove global VM (with migration payload returned), withdraw journey VM assignment
- Email: VM invitation received, accepted, declined, expired templates (fire-and-forget via EmailService.sendNotification)
- Token generation: `randomBytes(32).toString('hex')` stored on the `VerificationToken` table with type `VM_INVITATION` — OR stored directly on `Invitation` as a hashed token field

**Non-Goals:**
- Platform invitation flow (invite non-users to join Veervrat) — spec is defined but deferred; scope is VM invitations only for this item
- Notification bell events (notification system is item 18)
- Frontend UI (no frontend work in this item — item 24 handles search + invitation UI)
- Meilisearch user indexing (item 24)

## Decisions

### D1: Token storage — on `Invitation` row directly (not `VerificationToken` table)

`VerificationToken` has `type: VerificationType` which is a Postgres enum — adding `VM_INVITATION` would require a migration. Instead, store the raw token as a field on `Invitation` itself.

**Problem**: `Invitation` schema doesn't have a `token` field.

**Resolution**: Add `token String @unique` to `Invitation` model → requires a Prisma migration (`add-invitation-token`). Token is `randomBytes(32).toString('hex')` (64 hex chars), stored **plaintext** (it's not a credential — it's a URL-safe lookup key, not authentication).

Alternative considered: store in `VerificationToken` with new enum value → requires enum migration (ALTER TYPE in Postgres requires careful handling) + cross-table lookup complexity. The `Invitation` token field is cleaner.

### D2: Invitation expiry enforcement — at accept/decline time, not background job

When `POST /invitations/:token/accept` is called, the service checks `invitation.expiresAt < now()`. If expired, throw `422 InvitationExpiredException`. No cron job in this item. A future background job (or item 34 extension) can sweep and mark expired invites.

VM invite expiry: 7 days (per spec/13). Platform invite expiry: 30 days (deferred item).

### D3: Global VM swap — migration payload returned to client, no auto-cascade

When VA removes their global VM (`DELETE /api/v1/vm-relationships/global`):
- Service returns a migration payload listing all journey assignments that used this VM
- The payload is: `{ vmId, vmDisplayName, affectedJourneys: [{ journeyId, journeyTitle }] }`
- **No automatic action taken** — client shows migration UI, VA must explicitly choose per journey (item 24 frontend)
- The DELETE endpoint removes only the `VmRelationship` row; journey-level `JourneyVmAssignment` rows are untouched

Rationale: spec/01 confirms "changing global VM does not silently cascade to journeys — it always surfaces explicit migration choices."

### D4: Journey-level VM: assigned via accepted invitation, not direct assignment

`POST /api/v1/journeys/:id/vm` creates an `Invitation` of type `VM_JOURNEY` with `scopeId = journeyId`. Accept flow then creates `JourneyVmAssignment`. This enforces the explicit acceptance requirement from spec/04.

### D5: One pending global VM invite at a time — enforced at send time

When VA sends a new `VM_GLOBAL` invitation, service checks for any existing `PENDING` `VM_GLOBAL` invitation from that VA. If found, throws `409 PendingGlobalVmInviteException`. VA must cancel the existing one first.

### D6: Cross-module: InvitationsModule imports JourneysModule (for journey validation only)

When sending a `VM_JOURNEY` invitation, the service must verify the journey exists and belongs to the VA. It calls `JourneysRepository` via `JourneysModule` import. `VmRelationshipsModule` also imports `JourneysModule` to fetch slim journey context.

Per CLAUDE.md: import services, never repositories from other modules. So `VmRelationshipsModule` imports `JourneysModule` and uses `JourneysService` for lookups — but since `JourneysService` doesn't expose all methods needed, we export `JourneysRepository` from `JourneysModule` (already done for ErcService). The pattern is established.

### D7: Email templates — minimal bilingual inline strings, not full React Email components

For this item: templates render simple text (no complex layout). Each template is a React function component that accepts `{ language: 'EN' | 'MR', ... }` and returns a `<div>` with inline styles. Consistent with existing `VerifyEmailEmail.tsx` pattern.

## Risks / Trade-offs

- **Migration risk**: Adding `token String @unique` to `Invitation` → run `prisma migrate dev` locally, review SQL before production. Low risk (just an ADD COLUMN + unique index).
- **Token collision**: `randomBytes(32)` = 256 bits entropy. Collision probability negligible.
- **Expired invite UI**: Frontend (item 24) must handle `422 INVITATION_EXPIRED` gracefully — show user-friendly message not a raw error.
- **Global VM migration payload incomplete**: If VA has 50 journeys, payload is 50 items — no pagination. Acceptable for v1 (journey count per VA is small in practice).
