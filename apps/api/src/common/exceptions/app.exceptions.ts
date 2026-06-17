import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  UnauthorizedException,
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

export class ErcAlreadySelectedException extends ConflictException {
  constructor() {
    super({ error: 'ERC_ALREADY_SELECTED', message: 'This item is already selected in this journey.' });
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
    super({ error: 'INVITATION_REMINDER_ALREADY_SENT', message: 'A reminder has already been sent for this invitation.' });
  }
}

export class InvitationNotCancellableException extends ConflictException {
  constructor() {
    super({ error: 'INVITATION_NOT_CANCELLABLE', message: 'Only pending invitations can be cancelled.' });
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

export class EntityInUseException extends ConflictException {
  constructor(entity: string, reason: string) {
    super({
      error: 'ENTITY_IN_USE',
      message: `${entity} cannot be deleted: ${reason}`,
      details: { reason },
    });
  }
}
