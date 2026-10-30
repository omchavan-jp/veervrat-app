# dto

## Overview

Journey DTOs validate creation, state action and title. [create-journey.dto.ts:CreateJourneyDto] [update-journey-state.dto.ts:UpdateJourneyStateDto] [update-journey-title.dto.ts:UpdateJourneyTitleDto]

## Interface

- Creation takes sentence and weakness UUIDs and an optional title; state action is pause or resume. [create-journey.dto.ts:CreateJourneyDto] [update-journey-state.dto.ts:UpdateJourneyStateDto]

## Invariants

- Creation title is at most 255 characters; title updates require 1–255 characters. [create-journey.dto.ts:CreateJourneyDto] [update-journey-title.dto.ts:UpdateJourneyTitleDto]

## Side Effects

- Defines validation metadata. [update-journey-state.dto.ts:UpdateJourneyStateDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
