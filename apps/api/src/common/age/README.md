# age

## Overview

Pure UTC calendar helpers enforce the exported minimum age. [age.ts:MINIMUM_AGE_YEARS]

## Interface

- Local MINIMUM_AGE_YEARS=18; latestQualifyingDob(now?) returns the UTC date eighteen years before now; meetsMinimumAge(dob,now?) compares DOB calendar date against that cutoff. [age.ts:MINIMUM_AGE_YEARS] [age.ts:latestQualifyingDob] [age.ts:meetsMinimumAge]

## Invariants

- Time of day is ignored and a DOB equal to the cutoff qualifies. [age.ts:meetsMinimumAge]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
