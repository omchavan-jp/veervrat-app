# dto

## Overview

DTOs define profile, settings and account request validation and public and private response shapes. [update-profile.dto.ts:UpdateProfileDto] [public-profile.dto.ts:OwnProfileDto]

## Interface

- Profile updates accept display name, username, language, gender and date of birth; settings and visibility accept flags and preference maps. [update-profile.dto.ts:UpdateProfileDto] [update-settings.dto.ts:UpdateSettingsDto] [update-visibility.dto.ts:UpdateVisibilityDto]
- Password changes and deletion accept password proof; public profiles exclude date of birth while own profiles include it. [change-password.dto.ts:ChangePasswordDto] [change-password.dto.ts:DeleteAccountDto] [public-profile.dto.ts:PublicProfileDto]

## Invariants

- Username must match lowercase alphanumeric or underscore length 3–30; supported languages are EN and MR. [update-profile.dto.ts:UpdateProfileDto]
- New passwords are 8–128 characters; deletion password is optional. [change-password.dto.ts:ChangePasswordDto] [change-password.dto.ts:DeleteAccountDto]

## Side Effects

- Defines validation metadata and TypeScript response contracts. [update-profile.dto.ts:UpdateProfileDto] [public-profile.dto.ts:PublicProfileDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
