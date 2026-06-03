## 1. Backend — extend complete-onboarding

- [x] 1.1 Add `gender?: string` (max 50 chars) and `dob?: string` (IsDateString) to `CompleteOnboardingDto`
- [x] 1.2 Add `gender` and `dob` to `SessionUser` type in `auth.types.ts` and to the `userSelect` projection in `auth.repository.ts`
- [x] 1.3 Update `AuthRepository.markOnboardingComplete` to accept and persist `gender` and `dob`
- [x] 1.4 Update `AuthService.completeOnboarding` to receive and forward `gender` and `dob` to the repository
- [x] 1.5 Update `AuthController.completeOnboarding` to pass `dto.gender` and `dto.dob` to the service
- [x] 1.6 Write auth matrix tests in `auth.service.onboarding.spec.ts`: positive (authenticated user, all fields including gender/dob) + negative (unauthenticated — verifying SessionGuard)

## 2. Frontend — i18n keys

- [x] 2.1 Add `onboarding` namespace to `apps/web/messages/en.json` with keys for account-setup page (labels, hints, errors, CTAs) and framework page (section titles, process chart, final CTA)
- [x] 2.2 Add `onboarding` namespace to `apps/web/messages/mr.json` with Marathi translations for the same keys

## 3. Frontend — routing and layout

- [x] 3.1 Create `apps/web/app/(onboarding)/layout.tsx` — full-screen focused layout, no sidebar/header, wraps with `NextIntlClientProvider`
- [x] 3.2 Create `apps/web/app/(onboarding)/onboarding/layout.tsx` — auth guard: redirect to `/login` if unauthenticated; redirect to `/dashboard` if `onboardingCompletedAt` is set (for account-setup sub-route only)
- [x] 3.3 Create redirect from `apps/web/app/(onboarding)/onboarding/page.tsx` → `/onboarding/account-setup`

## 4. Frontend — account setup page

- [x] 4.1 Extend `authApi.completeOnboarding` in `lib/api/auth.ts` to accept `gender` and `dob` in the payload; update the `User` type to include `gender` and `dob`
- [x] 4.2 Extend `useCompleteOnboarding` hook in `hooks/use-auth.ts`: on success redirect to `/onboarding/framework` instead of `/dashboard`
- [x] 4.3 Create `apps/web/lib/validations/onboarding.ts` with Zod schema for account setup form (displayName required, username required + regex, language required, gender optional, dob optional ISO date)
- [x] 4.4 Create `apps/web/app/(onboarding)/onboarding/account-setup/page.tsx` — client component with React Hook Form + Zod; fields: display name, username (live check), language radio, gender, dob; submit calls `useCompleteOnboarding`; server error 409 mapped to username field error

## 5. Frontend — framework onboarding page

- [x] 5.1 Create `apps/web/app/(onboarding)/onboarding/framework/page.tsx` — client component; local state for current section (0=Section1, 1=Section2, 2=CTA); guard: if `onboardingCompletedAt === null` redirect to `/onboarding/account-setup`
- [x] 5.2 Implement Section 1 content: "What is Veervrat" — philosophy text, "Our stance" card (autonomy emphasis), VM philosophy note ("Why vratmitra, not mentor")
- [x] 5.3 Implement Section 2 content: "Process Chart" — 4-stage model (Recognition → Study → Practice → Integration) with stage descriptions
- [x] 5.4 Implement final CTA screen: question text, [Take a test now] → `/study`, [Explore the app first] → `/dashboard`; forward/back navigation between all three states

## 6. Tests

- [x] 6.1 Run `pnpm test` in `apps/api` and confirm all existing + new tests pass
- [x] 6.2 Run `pnpm test` in `apps/web` (if frontend test suite configured) and confirm passing
