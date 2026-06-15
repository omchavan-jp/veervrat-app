## 1. Data model

- [x] 1.1 Add nullable `completionSubmittedAt DateTime?` to `Journey` in `schema.prisma`
- [x] 1.2 Create additive migration `add_journey_completion_submitted_at`; apply to dev DB (5433) and test DB (5434); regenerate Prisma client
- [x] 1.3 Update `journeys.service.ts`: `submitCompletion` sets `completionSubmittedAt` when VM approval required; `approveCompletion` and self-approve `setCompleted` clear it on completion (single consistent writer path)

## 2. Backend — actions module

- [x] 2.1 Scaffold `apps/api/src/modules/actions/` (module, controller, service, repository, dto) and register in `app.module.ts`
- [x] 2.2 `actions.repository.ts`: aggregation reads over a journey-id set — ERC by status (REVISIT, SUBMITTED), active unacknowledged `VmSidenote`, new-ERC-available signal, journey `completionSubmittedAt`, `CustomErcReview` status; batched with `IN (...)`, no per-journey loops
- [x] 2.3 `actions.service.ts` `getVaActions(user)`: assert `isVa`; gather the VA's own journey ids; build the five grouped sections + `counts`
- [x] 2.4 `actions.service.ts` `getVmActions(user)`: resolve assigned/global-scoped journey ids via `VmRelationshipsService` (never a foreign repository); build the four grouped sections + `counts`; return empty queue when no assignments
- [x] 2.5 `actions.controller.ts`: `GET /actions` and `GET /vm-actions` under `SessionGuard`, `{ data }` envelope, camelCase

## 3. Backend — tests

- [x] 3.1 `actions.service.spec.ts`: VA aggregation — items land in correct sections; counts correct; empty case
- [x] 3.2 Auth-matrix (VM scoping): assigned VM sees their VA's submitted item (positive); unrelated VM does NOT see a non-assigned journey's item (negative); global VM sees across their VAs
- [x] 3.3 Journey completion-pending: `completionSubmittedAt` set on submit, cleared on approve and on no-VM self-approve

## 4. Frontend — API client

- [x] 4.1 `lib/api/actions.ts`: typed `getVaActions()` / `getVmActions()` returning the grouped + counts shapes; add query keys to `query-keys.ts`

## 5. Frontend — VA Actions page

- [x] 5.1 Rebuild `app/(app)/actions/page.tsx` as grouped work-queue from `getVaActions` (replace notifications-filter implementation)
- [x] 5.2 Sections in screen-spec-4 order; suggestions section Accept/Dismiss via existing endpoints with query invalidation; other items navigate to ERC/journey
- [x] 5.3 All four states (loading/empty "All clear…"/error/success); bilingual content Devanagari-primary

## 6. Frontend — shell + VM Guidance page

- [x] 6.1 Extract the shared app shell so `(vratmitra)` route group renders with the rail, auth gate, and providers (not shell-less)
- [x] 6.2 Build `app/(vratmitra)/vratmitra/guidance/page.tsx` from `getVmActions`; closure requests Approve/Return + inline note via existing endpoints; completion requests Approve; read-only sections render without controls
- [x] 6.3 All four states (loading/empty "No pending actions…"/error/success); responsive

## 7. Navigation

- [x] 7.1 Add conditional VM nav items (My Vratarthis, VM Guidance) in the shell, visible only when the user has active VM assignments; independent pending-count badges on `/actions` and `/vratmitra/guidance`; counts from the actions/vm-actions queries, invalidated on relevant mutations
- [x] 7.2 Add all new i18n keys to `messages/en.json` and `messages/mr.json` at parity

## 8. Verification

- [x] 8.1 API typecheck + web typecheck clean; production build of both packages passes
- [x] 8.2 Full API test suite green; new web component/unit tests green
- [x] 8.3 Backend probe: `GET /actions` and `GET /vm-actions` with a VA and a VM session — confirm scoping incl. the negative (unrelated VM) case
- [x] 8.4 Rendered-UI check: `/actions` and `/vratmitra/guidance` reachable from nav, four states, shell present, mobile+desktop; console/log clean
- [x] 8.5 Record any deferral (e.g. full `/my-vratarthis` page) explicitly in the status memory


## Notes

- **Deferred (recorded):** the full `/my-vratarthis` two-panel page (spec/22 §1) is not built in this item — only its data dependency (VM scope) and the VM Guidance page. Its nav item lands when that page is built. See actions-guidance design Non-Goals.
- DTO folder not needed — both endpoints are parameterless GETs under `SessionGuard`; no request body/query to validate.
- `/code-review` skill is not installed in this repo; verification done via the Definition-of-Done ladder (typecheck, both prod builds, 456 API + 94 web tests, backend probe with scoping negative case, rendered-UI across breakpoints).
