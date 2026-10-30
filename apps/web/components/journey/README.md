# journey

## Overview

Journey exposure and challenge tabs, reusable ERC pool and item controls, custom creation, and resolution check-ins. Journey activity feed and resolution management views.

## Interface

- ChallengesTab and ExposuresTab take journeyId, hasVm and optional viewerIsVm [challenges-tab.tsx:ChallengesTab] [exposures-tab.tsx:ExposuresTab].
- ErcPoolSection selects pool entries; ErcItemCard presents status and role-specific actions [erc-pool-section.tsx:ErcPoolSection] [erc-item-card.tsx:ErcItemCard].
- CustomErcForm takes journeyId, ercType, open and onOpenChange; CheckinForm and CheckinHistory take journeyId and resolutionId [custom-erc-form.tsx:CustomErcForm] [checkin-form.tsx:CheckinForm] [checkin-history.tsx:CheckinHistory].
- JourneyActivityFeed takes journeyId and renders localized events [journey-activity-feed.tsx:JourneyActivityFeed].
- ResolutionsTab takes journeyId, hasVm and optional viewerIsVm [resolutions-tab.tsx:ResolutionsTab].

## Invariants

- VM viewers do not see pool selection or custom-add controls in these tabs; item actions depend on viewer role and status [challenges-tab.tsx:ChallengesTab] [exposures-tab.tsx:ExposuresTab] [erc-item-card.tsx:ErcItemCard].
- Custom titles must be nonblank; optional numeric fields are included only for positive integers and fields vary by ERC type [custom-erc-form.tsx:parsePositiveInt] [custom-erc-form.tsx:CustomErcForm].
- Check-in status is DONE, PARTIAL or MISSED; history sorts newest first and captures current time after mount [checkin-form.tsx:STATUSES] [checkin-history.tsx:CheckinHistory].
- Resolution check-in form appears only while active and in progress; history appears after not-started while active [erc-item-card.tsx:ErcItemCard].
- Activity types map to icons and translation keys; Marathi title is used when available in Marathi locale [journey-activity-feed.tsx:ActivityRow].
- VM viewers do not see the resolution pool or add-custom button [resolutions-tab.tsx:ResolutionsTab].

## Side Effects

- Journey hooks fetch pools, items and check-ins and mutate selection, custom creation, check-ins, statuses, activation, removal, reviews and VM sidenotes [erc-pool-section.tsx:ErcPoolSection] [custom-erc-form.tsx:CustomErcForm] [checkin-form.tsx:CheckinForm] [erc-item-card.tsx:ErcItemCard].
- Queries journey activity and resolution items through hooks [journey-activity-feed.tsx:JourneyActivityFeed] [resolutions-tab.tsx:ResolutionsTab].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
