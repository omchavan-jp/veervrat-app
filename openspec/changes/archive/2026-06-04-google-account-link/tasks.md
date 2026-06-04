## 1. Database — Schema & Migration

- [x] 1.1 Add `GOOGLE_LINK` variant to `VerificationType` enum in `schema.prisma`
- [x] 1.2 Add nullable `metadata Json?` column to `VerificationToken` model in `schema.prisma`
- [x] 1.3 Run `prisma migrate dev --name add-google-link-token` and verify migration file
- [x] 1.4 Run `prisma generate` to update the client types

## 2. Backend — Repository

- [x] 2.1 Add `addAuthAccount(params: { userId, provider, providerAccountId })` method to `AuthRepository` — creates an `AuthAccount` row for an existing user
- [x] 2.2 Update `createVerificationToken` in `AuthRepository` to accept optional `metadata?: Record<string, unknown>` and pass it through to Prisma

## 3. Backend — Service

- [x] 3.1 In `handleGoogleLogin`: replace `throw new OAuthAccountConflictException()` with call to `createLinkPendingToken(existingUser.id, profile)` — create `GOOGLE_LINK` token with 15 min expiry and metadata `{ googleId, googleEmail: profile.email, displayName: profile.name }`
- [x] 3.2 Return `{ action: 'link_pending', token, frontendUrl }` from `handleGoogleLogin` when conflict detected (new return shape alongside existing `AuthResult`)
- [x] 3.3 Add `linkGoogleAccount(token: string, password: string, ipAddress, userAgent)` method to `AuthService`:
  - Find `VerificationToken` by token + type `GOOGLE_LINK` (unexpired, unused)
  - Throw `TokenInvalidException` if not found
  - Find existing user's `EMAIL` auth account, verify bcrypt password
  - Throw `InvalidCredentialsException` on mismatch
  - Call `authRepository.addAuthAccount` to create Google `AuthAccount` on existing user
  - Mark token used
  - Create and return session

## 4. Backend — Controller & DTO

- [x] 4.1 Create `apps/api/src/modules/auth/dto/link-google.dto.ts` with `token: string` (IsString, IsNotEmpty) and `password: string` (IsString, MinLength 8)
- [x] 4.2 Update `googleCallback` in `AuthController`: detect `action: 'link_pending'` result → `res.redirect(\`${this.frontendUrl}/link-account?token=\${result.token}\`)`
- [x] 4.3 Add `POST /auth/link-google` endpoint in `AuthController` decorated with `@SkipCsrf()` (called from `/link-account` page which bootstraps CSRF the same way as verify-email — simpler to skip; the token itself is the CSRF defence here), `@HttpCode(200)`, calls `authService.linkGoogleAccount`, sets session cookie, returns user

## 5. Backend — Tests

- [x] 5.1 Unit test `AuthService.linkGoogleAccount`: POSITIVE — valid token + correct password creates AuthAccount and returns session; NEGATIVE — wrong password returns 401; NEGATIVE — expired/used token returns 401
- [x] 5.2 Unit test `AuthService.handleGoogleLogin` conflict branch: returns `link_pending` action with token instead of throwing

## 6. Frontend — API & Hook

- [x] 6.1 Add `linkGoogle: (data: { token: string; password: string }) => ...` to `authApi` in `apps/web/lib/api/auth.ts`
- [x] 6.2 Add `useLinkGoogle()` mutation hook to `apps/web/hooks/use-auth.ts` — on success: `setQueryData` + redirect to `/onboarding` or `/dashboard` based on `onboardingCompletedAt`

## 7. Frontend — Link-Account Page

- [x] 7.1 Create `apps/web/app/(public)/link-account/page.tsx` as a `'use client'` component:
  - Read `?token=` from `useSearchParams()`
  - Show error state if no token
  - Form: password field only (email shown as read-only context, sourced from URL or hardcoded pattern)
  - Submit calls `useLinkGoogle` with token + password
  - Error handling: display `INVALID_CREDENTIALS` as "Incorrect password" and `TOKEN_INVALID` as "This link has expired — please try signing in with Google again"
- [x] 7.2 Add i18n keys to `apps/web/messages/en.json` under `auth.linkAccount`: `title`, `subtitle`, `passwordLabel`, `passwordPlaceholder`, `submit`, `submitting`, `expiredError`, `wrongPasswordError`, `noToken`
- [x] 7.3 Add matching i18n keys to `apps/web/messages/mr.json`

## 8. Frontend — Login Page Cleanup

- [x] 8.1 Remove the `OAUTH_ACCOUNT_CONFLICT` error message handling from `apps/web/app/(public)/login/page.tsx` — the conflict no longer lands on the login page with an error code
