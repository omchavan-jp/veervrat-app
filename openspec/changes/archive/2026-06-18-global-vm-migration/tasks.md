# Tasks

## Backend — schema
- [x] Add `User.tourResetAt DateTime?` (`tour_reset_at`) + migration

## Backend — global VM cascade
- [x] `vm-relationships.dto.ts`: `RemoveGlobalVmDto { cascade?: 'keep' | 'unassign' }`
- [x] Repository: `endJourneyAssignmentsForVm(vmId, vratarthiId)` (bulk end active assignments)
- [x] Service `removeGlobalVm(user, cascade)`: end global; if `unassign`, end journey assignments; notify outgoing VM (`VM_WITHDREW`); return `{ removedVmId, affectedJourneys, cascade }`
- [x] Controller: accept optional `@Body() RemoveGlobalVmDto` on `DELETE /vm-relationships/global`
- [x] Tests: keep vs unassign; pending approvals untouched; notify; 404 no-global; 403 non-VA

## Backend — restart tour
- [x] Users repository: `setTourReset(userId, date)`
- [x] Users service: `restartTour(userId)`
- [x] Users controller: `POST /users/me/restart-tour`
- [x] `ownProfileSelect` returns `tourResetAt`; expose on `GET /users/me`
- [x] Tests: sets tourResetAt, leaves onboardingCompletedAt; unauthenticated 401

## Frontend — Section 5
- [x] `lib/api/vm-relationships.ts`: `removeGlobalVm(cascade)`; `lib/api/users.ts`: `restartTour()`
- [x] Settings page: `VratmitraSection` — current global VM, Change (remove+invite), Remove (cascade choice), Restart tour
- [x] i18n `settings.vratmitra*` keys (en + mr parity)

## Verification
- [x] api + web typecheck, both prod builds, full test suites
- [x] Probe: remove keep/unassign + restart-tour + auth-negatives; browser Section 5; cleanup
- [x] `openspec validate global-vm-migration --strict`
