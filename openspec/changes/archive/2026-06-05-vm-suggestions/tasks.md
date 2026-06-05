## 1. Repository — sidenote CRUD + updated selects

- [x] 1.1 Add `VmSidenoteSlim` type to `erc.repository.ts` (id, vmId, text, acknowledgedAt, createdAt)
- [x] 1.2 Add `vmSidenote: VmSidenoteSlim | null` to `JourneyErcItem` type
- [x] 1.3 Update `listJourneyItems` selects for all 3 types to include `vmSidenote` (where revokedAt is null)
- [x] 1.4 Update `findById` selects for all 3 types to include `vmSidenote` (where revokedAt is null)
- [x] 1.5 Add `upsertSidenote(itemId, vmId, text, ercType): Promise<VmSidenoteSlim>` to `ErcRepository`
- [x] 1.6 Add `revokeSidenote(itemId, ercType): Promise<VmSidenoteSlim | null>` — returns null if none active
- [x] 1.7 Add `acknowledgeSidenote(itemId, ercType): Promise<VmSidenoteSlim | null>` — returns null if none active

## 2. Service — suggest / unsuggest / acknowledge

- [x] 2.1 Extend `getJourneyAndCheckPermission` action union to include `'erc.suggest'`
- [x] 2.2 Add `suggestItem(user, journeyId, itemId, text, ercType)`: uses `erc.suggest` permission check; calls `upsertSidenote`; fires `VM_SUGGESTION_NEW` notification to journey `vratarthiId`
- [x] 2.3 Add `unsuggestItem(user, journeyId, itemId, ercType)`: uses `erc.suggest` permission check; calls `revokeSidenote`; throws 404 if no active sidenote; fires `VM_SUGGESTION_DISMISSED` notification to VA
- [x] 2.4 Add `acknowledgeSidenoteItem(user, journeyId, itemId, ercType)`: uses `erc.select` permission check (VA owner); calls `acknowledgeSidenote`; throws 404 if no active sidenote; returns updated sidenote

## 3. Controller — 9 new endpoints

- [x] 3.1 Add `SuggestErcDto` (body: `{ text: string }`) in `erc/dto/`
- [x] 3.2 Add `POST :itemId/suggest` and `DELETE :itemId/suggest` and `POST :itemId/sidenote/acknowledge` to `ExposuresController`
- [x] 3.3 Same 3 endpoints to `ResolutionsController`
- [x] 3.4 Same 3 endpoints to `ChallengesController`

## 4. Tests (erc.service.spec.ts)

- [x] 4.1 Add `makeSidenoteRepo()` factory with `upsertSidenote`, `revokeSidenote`, `acknowledgeSidenote` mocks; extend `makeRepo()` accordingly
- [x] 4.2 `suggestItem` suite: VM positive (creates sidenote + notification), VA → 403, non-assigned VM → 403, ERC item not found → 404
- [x] 4.3 `unsuggestItem` suite: VM positive (revokes + notification), VA → 403, non-assigned VM → 403, no active sidenote → 404
- [x] 4.4 `acknowledgeSidenoteItem` suite: VA positive (sets acknowledgedAt), VM → 403, non-owner VA → 403, no active sidenote → 404
