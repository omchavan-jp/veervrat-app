## Why

After signup/Google OAuth, new users hit `onboardingCompletedAt === null` and the app-layout guard redirects them to `/onboarding` — but that route does not exist. Completing Item 9 wires up the full 3-layer onboarding experience described in spec/decisions/12_onboarding.md so that new vratarthis can reach the dashboard.

## What Changes

- Backend: extend `CompleteOnboardingDto` to accept `gender` and `dob` fields; update `AuthService.completeOnboarding` and `AuthRepository.markOnboardingComplete` to persist them
- Backend: add `gender?` and `dob?` fields to `SessionUser` type and `userSelect` projection so the API response includes them
- Frontend: create `/onboarding` route group `(onboarding)` with its own layout (no sidebar, full-screen focus)
- Frontend: implement **Account Setup page** (`/onboarding/account-setup`) — display name, username (live check), language preference, optional gender/dob
- Frontend: implement **Framework Onboarding page** (`/onboarding/framework`) — two sections (What is Veervrat, Process Chart) with forward/back navigation; final CTA screen ("Ready to take your first test?")
- Frontend: wire `useCompleteOnboarding` mutation; on submit → POST `/auth/complete-onboarding` → redirect to `/onboarding/framework`
- Frontend: on framework CTA → "Take test now" redirects to `/study` (placeholder, will be wired in Item 10); "Explore first" calls `markFrameworkSeen` (or just flags `onboardingCompletedAt` which is already set by account-setup step) and goes to `/dashboard`
- Frontend: gate `/onboarding/framework` behind account-setup completion (check `onboardingCompletedAt` set)
- Frontend: add onboarding i18n keys to `en.json` and `mr.json`
- Tests: auth matrix — `POST /auth/complete-onboarding` positive (authenticated user without onboarding) and negative (unauthenticated); unit tests for updated DTO validation

## Capabilities

### New Capabilities
- `onboarding-account-setup`: Account setup step — collect displayName, username, language, optional gender/dob via `POST /auth/complete-onboarding`; username live uniqueness check
- `onboarding-framework`: Framework onboarding page — two-section read-only intro flow; final CTA routing to study flow or dashboard

### Modified Capabilities
- `auth-complete-onboarding`: DTO and service layer extended to accept and persist `gender` and `dob`

## Impact

- `apps/api/src/modules/auth/dto/complete-onboarding.dto.ts` — add gender, dob
- `apps/api/src/modules/auth/auth.service.ts` — pass gender/dob to repository
- `apps/api/src/modules/auth/auth.repository.ts` — persist gender/dob in markOnboardingComplete
- `apps/api/src/modules/auth/types/auth.types.ts` — add gender/dob to SessionUser
- `apps/web/app/(onboarding)/` — new route group with layout, account-setup page, framework page
- `apps/web/hooks/use-auth.ts` — extend completeOnboarding mutation payload type
- `apps/web/lib/api/auth.ts` — extend completeOnboarding call to include gender/dob
- `apps/web/messages/en.json` + `mr.json` — add onboarding keys
- No new dependencies; no DB migrations needed (gender and dob columns already exist on users table)
