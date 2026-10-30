# exceptions

## Overview

Exports structured domain HTTP exception classes built on imported Nest exception/status APIs. [app.exceptions.ts:EntityNotFoundException] [app.exceptions.ts:RateLimitedException]

## Interface

- Local EntityNotFoundException, AccessDeniedException, DuplicateEntityException, ValidationException, EntityInUseException produce entity/access/validation error bodies with supplied IDs, fields, details or reasons. [app.exceptions.ts:EntityNotFoundException] [app.exceptions.ts:AccessDeniedException] [app.exceptions.ts:DuplicateEntityException] [app.exceptions.ts:ValidationException] [app.exceptions.ts:EntityInUseException]
- Local InvalidCredentialsException, ReauthenticationRequiredException, PasswordIncorrectException, EmailNotVerifiedException, UnderageException, SignupRequiredException, AccountSuspendedException, AccountDeletedException, SessionExpiredException, NoPasswordSetException represent account/auth failures; deleted account details serialize deletedAt as ISO. [app.exceptions.ts:InvalidCredentialsException] [app.exceptions.ts:ReauthenticationRequiredException] [app.exceptions.ts:PasswordIncorrectException] [app.exceptions.ts:EmailNotVerifiedException] [app.exceptions.ts:UnderageException] [app.exceptions.ts:SignupRequiredException] [app.exceptions.ts:AccountSuspendedException] [app.exceptions.ts:AccountDeletedException] [app.exceptions.ts:SessionExpiredException] [app.exceptions.ts:NoPasswordSetException]
- Local TokenExpiredException, TokenInvalidException, OAuthAccountConflictException, UserUsernameTakenException, AccountLockedException, RateLimitedException represent token/conflict/throttling failures; lock/rate errors carry supplied wait durations. [app.exceptions.ts:TokenExpiredException] [app.exceptions.ts:TokenInvalidException] [app.exceptions.ts:OAuthAccountConflictException] [app.exceptions.ts:UserUsernameTakenException] [app.exceptions.ts:AccountLockedException] [app.exceptions.ts:RateLimitedException]
- Local ErcAlreadySelectedException, InvalidErcStatusTransitionException, JourneyConflictException, InvalidCheckinStateException, InvalidStateTransitionException, TestAlreadySubmittedException, TestNotSubmittedException, InvitationExpiredException, InvitationNotPendingException, InvitationReminderAlreadySentException, InvitationNotCancellableException, PendingGlobalVmInviteException, CustomErcAlreadyPendingException expose domain-specific error codes/messages and transition/conflict details. [app.exceptions.ts:ErcAlreadySelectedException] [app.exceptions.ts:InvalidErcStatusTransitionException] [app.exceptions.ts:JourneyConflictException] [app.exceptions.ts:InvalidCheckinStateException] [app.exceptions.ts:InvalidStateTransitionException] [app.exceptions.ts:TestAlreadySubmittedException] [app.exceptions.ts:TestNotSubmittedException] [app.exceptions.ts:InvitationExpiredException] [app.exceptions.ts:InvitationNotPendingException] [app.exceptions.ts:InvitationReminderAlreadySentException] [app.exceptions.ts:InvitationNotCancellableException] [app.exceptions.ts:PendingGlobalVmInviteException] [app.exceptions.ts:CustomErcAlreadyPendingException]

## Invariants

- Every constructor provides an error code and message; invalid credentials/session expiry use 401, reauthentication/incorrect password use 403, account deletion uses 410, and lock/rate errors use 429. [app.exceptions.ts:InvalidCredentialsException] [app.exceptions.ts:SessionExpiredException] [app.exceptions.ts:ReauthenticationRequiredException] [app.exceptions.ts:PasswordIncorrectException] [app.exceptions.ts:AccountDeletedException] [app.exceptions.ts:AccountLockedException] [app.exceptions.ts:RateLimitedException]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
