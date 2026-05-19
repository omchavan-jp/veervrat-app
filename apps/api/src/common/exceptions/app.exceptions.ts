import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  UnauthorizedException,
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
