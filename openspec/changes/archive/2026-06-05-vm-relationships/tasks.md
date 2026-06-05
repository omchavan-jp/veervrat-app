## 1. Schema migration

- [x] 1.1 Add `token String @unique` field to `Invitation` model in `schema.prisma`
- [x] 1.2 Run `pnpm --filter api prisma migrate dev --name add-invitation-token` and verify migration SQL

## 2. Exceptions

- [x] 2.1 Add `InvitationExpiredException` (422), `InvitationNotPendingException` (409), `InvitationNotCancellableException` (409), `PendingGlobalVmInviteException` (409) to `common/exceptions/app.exceptions.ts`

## 3. InvitationsModule — repository

- [x] 3.1 Create `apps/api/src/modules/invitations/invitations.repository.ts` with methods:
  - `create(data)` — insert Invitation row (generate token via randomBytes(32).toString('hex'), set expiresAt)
  - `findByToken(token)` — findUnique on token field
  - `findById(id)` — findUnique on id
  - `findPendingGlobalVmByInviter(inviterId)` — find pending VM_GLOBAL invite from this VA
  - `updateStatus(id, status, extra?)` — update status + optional acceptedAt/cancelledAt
  - `listByInviter(inviterId)` — findMany ordered by createdAt DESC
  - `findActiveJourneyVmAssignments(vmId, vatarthiId)` — for global VM removal migration payload

## 4. InvitationsModule — service

- [x] 4.1 Create `apps/api/src/modules/invitations/invitations.service.ts` with:
  - `sendVmInvitation(user, dto)`: permission check (`vm_invitation.send`) → check one-pending-global constraint → validate journey ownership (if journey-scoped) → resolve invitee by email → create invitation → send email (fire-and-forget)
  - `acceptInvitation(user, token)`: find by token → 404 if not found → check not expired (422) → check PENDING (409) → check invitee matches user (403) → create VmRelationship or JourneyVmAssignment → update status ACCEPTED
  - `declineInvitation(user, token)`: find by token → guards → check invitee matches (403) → update DECLINED → send declined email
  - `cancelInvitation(user, id)`: find by id → check inviter matches (403) → check PENDING (409) → update CANCELLED
  - `listInvitations(user)`: return all invitations sent by user

## 5. InvitationsModule — DTOs

- [x] 5.1 Create `apps/api/src/modules/invitations/dto/send-invitation.dto.ts`:
  - `type: InvitationType` (`@IsEnum`)
  - `inviteeEmail: string` (`@IsEmail`)
  - `scopeId?: string` (`@IsOptional @IsUUID`)
- [x] 5.2 Create `apps/api/src/modules/invitations/dto/token-param.dto.ts` (`@IsString @IsNotEmpty`)

## 6. InvitationsModule — controller + module wiring

- [x] 6.1 Create `apps/api/src/modules/invitations/invitations.controller.ts`:
  - `POST /api/v1/invitations` → `sendVmInvitation` (SessionGuard, 201)
  - `POST /api/v1/invitations/:token/accept` → `acceptInvitation` (SessionGuard, 200)
  - `POST /api/v1/invitations/:token/decline` → `declineInvitation` (SessionGuard, 200)
  - `DELETE /api/v1/invitations/:id` → `cancelInvitation` (SessionGuard, 200)
  - `GET /api/v1/invitations` → `listInvitations` (SessionGuard, 200)
- [x] 6.2 Create `apps/api/src/modules/invitations/invitations.module.ts` — register controller + service + repository; import AuthModule (for SessionGuard), EmailModule, JourneysModule, UsersModule
- [x] 6.3 Import `InvitationsModule` in `AppModule`

## 7. VmRelationshipsModule — repository

- [x] 7.1 Create `apps/api/src/modules/vm-relationships/vm-relationships.repository.ts` with:
  - `createGlobalRelationship(vatarthiId, vmId, acceptedAt)` — insert VmRelationship ACTIVE
  - `findActiveGlobalVm(vatarthiId)` — find active VmRelationship for VA
  - `endGlobalVm(id)` — set endedAt = now (soft-end; Prisma model has `endedAt` field)
  - `findActiveJourneyAssignmentsForVm(vmId, vatarthiId)` — for migration payload: JourneyVmAssignment rows where vmId matches + journey belongs to VA
  - `createJourneyAssignment(journeyId, vmId, acceptedAt)` — insert JourneyVmAssignment ACTIVE
  - `findActiveJourneyAssignment(journeyId, vmId)` — find specific assignment
  - `endJourneyAssignment(id)` — set endedAt = now

## 8. VmRelationshipsModule — service

- [x] 8.1 Create `apps/api/src/modules/vm-relationships/vm-relationships.service.ts` with:
  - `removeGlobalVm(user)`: find active global VM → 404 if none → permission check (`journey.view`-style: VA owns their own global VM relationship) → end it → fetch affected journey assignments → return migration payload
  - `withdrawJourneyVm(user, journeyId)`: find journey → find active assignment for user on that journey → 403 if not found → permission check (`vm_relationship.withdraw`) → end assignment → return 200
  - Internal methods used by InvitationsService after accept: `createFromGlobalInvite(inviterId, inviteeId, acceptedAt)`, `createFromJourneyInvite(journeyId, inviteeId, acceptedAt)`

## 9. VmRelationshipsModule — controller + module wiring

- [x] 9.1 Create `apps/api/src/modules/vm-relationships/vm-relationships.controller.ts`:
  - `DELETE /api/v1/vm-relationships/global` → `removeGlobalVm` (SessionGuard, 200)
  - `DELETE /api/v1/journeys/:journeyId/vm` → `withdrawJourneyVm` (SessionGuard, 200)
- [x] 9.2 Create `apps/api/src/modules/vm-relationships/vm-relationships.module.ts` — export `VmRelationshipsService`; import JourneysModule
- [x] 9.3 Import `VmRelationshipsModule` in `AppModule`; import it in `InvitationsModule` so `acceptInvitation` can call `VmRelationshipsService`

## 10. Email templates

- [x] 10.1 Create `VmInvitationEmail.tsx` — sent to invitee when invited; includes VA name, scope, accept link (token URL)
- [x] 10.2 Create `VmInvitationAcceptedEmail.tsx` — sent to VA when invitee accepts
- [x] 10.3 Create `VmInvitationDeclinedEmail.tsx` — sent to VA when invitee declines
- [x] 10.4 Wire email calls in `InvitationsService`: `sendVmInvitation` → `VmInvitationEmail` (sendNotification); `declineInvitation` → `VmInvitationDeclinedEmail` (sendNotification)

## 11. Tests — InvitationsService (unit)

- [x] 11.1 Create `apps/api/src/modules/invitations/invitations.service.spec.ts`:
  - AUTH MATRIX POSITIVE: VA can send VM_GLOBAL invitation
  - AUTH MATRIX NEGATIVE: non-VA cannot send invitation (403)
  - AUTH MATRIX POSITIVE: invitee can accept their own invitation
  - AUTH MATRIX NEGATIVE: wrong user cannot accept (403)
  - AUTH MATRIX POSITIVE: invitee can decline their own invitation
  - AUTH MATRIX NEGATIVE: wrong user cannot decline (403)
  - AUTH MATRIX POSITIVE: VA can cancel their own pending invitation
  - AUTH MATRIX NEGATIVE: different VA cannot cancel (403)
  - NEGATIVE: expired invitation → 422 InvitationExpiredException
  - NEGATIVE: non-pending invitation accept → 409 InvitationNotPendingException
  - NEGATIVE: second VM_GLOBAL invite while one pending → 409 PendingGlobalVmInviteException
  - POSITIVE: accepted VM_GLOBAL creates VmRelationship via VmRelationshipsService
  - POSITIVE: accepted VM_JOURNEY creates JourneyVmAssignment via VmRelationshipsService

## 12. Tests — VmRelationshipsService (unit)

- [x] 12.1 Create `apps/api/src/modules/vm-relationships/vm-relationships.service.spec.ts`:
  - AUTH MATRIX POSITIVE: VA with active global VM can remove it → returns migration payload
  - AUTH MATRIX NEGATIVE: VA with no active global VM → 404
  - AUTH MATRIX POSITIVE: VM can withdraw from assigned journey
  - AUTH MATRIX NEGATIVE: VM not assigned to journey → 403
  - AUTH MATRIX NEGATIVE: non-VM user cannot call withdraw → 403
  - POSITIVE: migration payload includes all affected journey assignments
  - POSITIVE: ERC items in SUBMITTED state are untouched (no cascade check — this is a repository-layer invariant, not a service action)

## 13. Run tests

- [x] 13.1 Run `pnpm --filter api test` — all tests must pass before done
