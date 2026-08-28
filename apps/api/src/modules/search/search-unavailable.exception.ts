import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when search for a given entity type has not yet been migrated to Postgres.
 * The previous Meilisearch backend was never provisioned, so this replaces a silent
 * empty return with an explicit signal the caller can render as "search unavailable".
 *
 * 501 Not Implemented: the server does not support the functionality required to
 * fulfill the request. Accurate here — the search capability exists in the API
 * contract but has no working backend for this entity type.
 */
export class SearchUnavailableException extends HttpException {
  constructor(entityType: string) {
    super(
      {
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        error: 'Search Unavailable',
        message: `Search for ${entityType} is not available yet.`,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
