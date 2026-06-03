## Context

The app-layout guard (`(app)/layout-client.tsx`) already redirects users with `onboardingCompletedAt === null` to `/onboarding`, but that route does not exist. The backend endpoint `POST /auth/complete-onboarding` exists and sets `onboardingCompletedAt` but is missing `gender` and `dob` fields. The `useCompleteOnboarding` hook and `authApi.completeOnboarding` stub are present in the frontend. No DB migration is needed — `gender` and `dob` columns already exist in the `users` table.

## Goals / Non-Goals

**Goals:**
- Add a `/onboarding` route group with account-setup and framework pages
- Extend the complete-onboarding endpoint to accept and persist gender/dob
- Gate the dashboard behind onboarding completion (already done by layout-client)
- Pass username uniqueness check through during account-setup

**Non-Goals:**
- UI Walkthrough (Layer 3 of onboarding — tooltip/coach marks) — deferred to when each section is built
- Study flow routing from framework CTA — `/study` is a placeholder link for now (Item 10)
- Email notification after onboarding completion

## Decisions

**1. Onboarding route group: `(onboarding)` sibling to `(public)` and `(app)`**

The framework spec requires a "full-screen focused flow, no sidebar nav". A separate route group `(onboarding)` with its own layout (no header/sidebar) is the cleanest approach. This avoids conditionally hiding the app header inside `(app)`.

The routes are:
- `app/(onboarding)/layout.tsx` — onboarding-scoped layout, no nav
- `app/(onboarding)/onboarding/account-setup/page.tsx`
- `app/(onboarding)/onboarding/framework/page.tsx`

The root `/onboarding` redirect goes to `/onboarding/account-setup`. A middleware-level or layout-level redirect handles this.

**2. Two-step onboarding flow: account-setup submits first, framework is post-submission**

Account setup calls `POST /auth/complete-onboarding` (which sets `onboardingCompletedAt`). Framework onboarding is then shown as a separate page the user lands on after successful submission. No second API call is needed for framework completion — the user just navigates to `/dashboard` or `/study` from the CTA.

This means the dashboard guard (`onboardingCompletedAt === null`) is cleared after account-setup. Framework onboarding is shown unconditionally as the next step; the user can't access the dashboard until they click one of the two CTAs. This is enforced by the framework page layout guard: if `onboardingCompletedAt` is NOT null and there's no `framework-seen` flag, show framework; otherwise redirect to dashboard.

For simplicity in v1, we do not track `frameworkSeen` in the DB — the framework page is shown exactly once as the natural redirect after account-setup completion. Navigating directly to `/dashboard` bypasses it, which is acceptable.

**3. Backend: gender is stored as a string, dob as ISO date**

`gender` is `String?` in Prisma. The DTO accepts an optional free-text string (no enum enforcement in v1 per the spec which lists it as optional with no specified values). `dob` is `DateTime?` stored as a date-only column (`@db.Date`). The DTO accepts an ISO 8601 date string and the service converts it to a `Date`.

**4. `SessionUser` type extended with gender and dob**

Adding `gender` and `dob` to the `userSelect` projection and `SessionUser` interface makes them available client-side without an extra call. The frontend `User` type in `lib/api/auth.ts` is updated to match.

**5. Framework page: client component with local step state**

The framework page has two sections + a final CTA screen. This is local UI state (no API calls between sections), so a single client component with `useState` for the current section index is the right choice.

## Risks / Trade-offs

- [Risk: Framework page can be skipped by navigating directly to `/dashboard`] → Acceptable in v1. The framework page is educational, not security-gating. The important gate is `onboardingCompletedAt` which is already enforced.
- [Risk: `gender` as free-text string may cause inconsistency] → Acceptable for v1. The spec lists gender as optional with no specified values. An enum can be added later if needed.
- [Risk: Username taken after live-check but before form submit] → Server returns `DuplicateEntityException` which maps to a 409. The form's `onError` handler maps this to a field-level error on username. Same pattern as the signup page.

## Open Questions

None — spec/decisions/12_onboarding.md is fully specified for the scope of this item.
