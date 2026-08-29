import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  UnauthorizedException,
  GoneException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id: string) {
    super({ error: 'ENTITY_NOT_FOUND', message: `${entity} not found`, details: { id } });
  }
}

export class AccessDeniedException extends ForbiddenException {
  constructor(message = 'Access denied') {
    super({ error: 'ACCESS_DENIED', message });
  }
}

export class DuplicateEntityException extends ConflictException {
  constructor(entity: string, field: string) {
    super({
      error: 'DUPLICATE_ENTITY',
      message: `${entity} with this ${field} already exists`,
      details: { field },
    });
  }
}

export class ValidationException extends UnprocessableEntityException {
  constructor(message: string, details?: unknown) {
    super({ error: 'VALIDATION_ERROR', message, details });
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }
}

export class EmailNotVerifiedException extends ForbiddenException {
  constructor() {
    super({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email before logging in',
    });
  }
}

export class UnderageException extends ForbiddenException {
  constructor() {
    super({
      error: 'UNDERAGE',
      // Deliberately final. The wording must not suggest the address can be registered later,
      // or the natural response is to retry with a different date.
      message: 'Veervrat is for adults aged 18 and over.',
    });
  }
}

export class SignupRequiredException extends ForbiddenException {
  constructor() {
    super({
      error: 'SIGNUP_REQUIRED',
      message: 'No account found for that Google account. Please sign up first.',
    });
  }
}

export class AccountSuspendedException extends ForbiddenException {
  constructor() {
    super({
      error: 'ACCOUNT_SUSPENDED',
      message: 'This account has been suspended. Please contact an administrator.',
    });
  }
}

/**
 * Carries the deletion date because "this account was deleted" invites the question "when?",
 * and the answer decides what the person does next — recognising their own action, or
 * discovering one they did not make.
 *
 * `Gone` rather than `NotFound`: the account existed and the address is still the right one.
 * Saying "not found" would suggest a typo and send them round the loop again.
 *
 * Only ever raised once control of the identity has been proven — a completed Google round
 * trip. Never in response to a typed address, which anyone can supply for anyone.
 */
export class AccountDeletedException extends GoneException {
  constructor(deletedAt: Date) {
    super({
      error: 'ACCOUNT_DELETED',
      message: 'This account was deleted. Deletion is permanent and it cannot be restored.',
      deletedAt: deletedAt.toISOString(),
    });
  }
}

export class SessionExpiredException extends UnauthorizedException {
  constructor() {
    super({
      error: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again.',
    });
  }
}

export class TokenExpiredException extends UnprocessableEntityException {
  constructor(tokenType: string) {
    super({
      error: 'TOKEN_EXPIRED',
      message: `This ${tokenType} token has expired. Please request a new one.`,
    });
  }
}

export class TokenInvalidException extends UnprocessableEntityException {
  constructor() {
    super({
      error: 'TOKEN_INVALID',
      message: 'This token is invalid or has already been used.',
    });
  }
}

export class OAuthAccountConflictException extends ConflictException {
  constructor() {
    super({
      error: 'OAUTH_ACCOUNT_CONFLICT',
      message:
        'An account with this email already exists using a different login method. Please log in with your original method.',
    });
  }
}

export class UserUsernameTakenException extends ConflictException {
  constructor() {
    super({ error: 'USER_USERNAME_TAKEN', message: 'This username is already taken' });
  }
}

export class AccountLockedException extends HttpException {
  constructor(secondsRemaining: number) {
    super(
      {
        error: 'ACCOUNT_LOCKED',
        message: `Too many failed login attempts. Try again in ${secondsRemaining} seconds.`,
        details: { secondsRemaining },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * A request refused by the rate limiter.
 *
 * Deliberately shaped like `AccountLockedException` — same status, same `retryAfter` detail —
 * because to the person on the other end they are the same event: "you have done this too many
 * times, wait." The client should not need to know which layer refused.
 *
 * Before this existed, throttled requests reached the client as
 * `{"error":"INTERNAL_ERROR","message":"ThrottlerException: Too Many Requests"}` — the framework
 * exception carries a *string* body, so the global filter never assigned an error code and the
 * default stood. Users saw an internal error for something entirely expected.
 */
export class RateLimitedException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        error: 'RATE_LIMITED',
        message: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
        details: { retryAfterSeconds },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class ErcAlreadySelectedException extends ConflictException {
  constructor() {
    super({
      error: 'ERC_ALREADY_SELECTED',
      message: 'This item is already selected in this journey.',
    });
  }
}

export class InvalidErcStatusTransitionException extends ConflictException {
  constructor(from: string, to: string) {
    super({
      error: 'INVALID_ERC_STATUS_TRANSITION',
      message: `Cannot transition ERC item from '${from}' to '${to}'.`,
      details: { from, to },
    });
  }
}

export class JourneyConflictException extends ConflictException {
  constructor(existingJourneyId: string, state: string) {
    super({
      error: 'JOURNEY_ALREADY_EXISTS',
      message: 'A non-completed journey already exists for this sentence.',
      details: { existingJourneyId, state },
    });
  }
}

export class InvalidCheckinStateException extends UnprocessableEntityException {
  constructor() {
    super({
      error: 'INVALID_CHECKIN_STATE',
      message: 'Check-ins can only be logged on in-progress resolutions.',
    });
  }
}

export class InvalidStateTransitionException extends ConflictException {
  constructor(from: string, action: string) {
    super({
      error: 'INVALID_STATE_TRANSITION',
      message: `Cannot perform '${action}' on a journey in state '${from}'.`,
      details: { from, action },
    });
  }
}

export class TestAlreadySubmittedException extends ConflictException {
  constructor() {
    super({ error: 'TEST_ALREADY_SUBMITTED', message: 'This test has already been submitted.' });
  }
}

export class TestNotSubmittedException extends ConflictException {
  constructor() {
    super({ error: 'TEST_NOT_SUBMITTED', message: 'This test has not been submitted yet.' });
  }
}

export class InvitationExpiredException extends UnprocessableEntityException {
  constructor() {
    super({ error: 'INVITATION_EXPIRED', message: 'This invitation has expired.' });
  }
}

export class InvitationNotPendingException extends ConflictException {
  constructor() {
    super({ error: 'INVITATION_NOT_PENDING', message: 'This invitation is no longer pending.' });
  }
}

export class InvitationReminderAlreadySentException extends ConflictException {
  constructor() {
    super({
      error: 'INVITATION_REMINDER_ALREADY_SENT',
      message: 'A reminder has already been sent for this invitation.',
    });
  }
}

export class InvitationNotCancellableException extends ConflictException {
  constructor() {
    super({
      error: 'INVITATION_NOT_CANCELLABLE',
      message: 'Only pending invitations can be cancelled.',
    });
  }
}

export class PendingGlobalVmInviteException extends ConflictException {
  constructor() {
    super({
      error: 'PENDING_GLOBAL_VM_INVITE_EXISTS',
      message: 'A pending global VM invitation already exists. Cancel it before sending a new one.',
    });
  }
}

export class CustomErcAlreadyPendingException extends ConflictException {
  constructor() {
    super({
      error: 'CUSTOM_ERC_ALREADY_PENDING',
      message: 'This custom ERC item is already pending review.',
    });
  }
}

// A password-bearing action was attempted on an account that has no password set
// (e.g. a Google-only user calling changePassword). The user is not missing — the
// operation simply does not apply to their account type.
export class NoPasswordSetException extends UnprocessableEntityException {
  constructor() {
    super({
      error: 'NO_PASSWORD_SET',
      message:
        'This account has no password. Set a password first using forgot-password or the settings page.',
    });
  }
}

export class EntityInUseException extends ConflictException {
  constructor(entity: string, reason: string) {
    super({
      error: 'ENTITY_IN_USE',
      message: `${entity} cannot be deleted: ${reason}`,
      details: { reason },
    });
  }
}
