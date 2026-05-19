import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
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
