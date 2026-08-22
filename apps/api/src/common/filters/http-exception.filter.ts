import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * A fallback error code for exceptions that carry no structured body.
 *
 * Domain exceptions in `app.exceptions.ts` set their own specific code; this exists so that an
 * exception thrown *without* one still reports its class of failure honestly. `HTTP_429` would
 * be truthful but useless to a client; `INTERNAL_ERROR` for a 429 is an outright lie.
 */
// 500 as a bare number: `statusCode` is a plain number off `getStatus()`, and comparing it to
// an enum member trips no-unsafe-enum-comparison.
const SERVER_ERROR_FLOOR = 500;

const ERROR_CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
};

function statusCodeToErrorCode(statusCode: number): string {
  const known = ERROR_CODE_BY_STATUS[statusCode];
  if (known) return known;

  return statusCode >= SERVER_ERROR_FLOOR ? 'INTERNAL_ERROR' : `HTTP_${statusCode}`;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        error = (bodyObj.error as string) || `HTTP_${statusCode}`;
        message = (bodyObj.message as string) || exception.message;
        details = bodyObj.details;
      } else {
        // A string body — what framework exceptions like `ThrottlerException` carry. This branch
        // previously set only `message`, leaving `error` at its `INTERNAL_ERROR` default, so a
        // 429 reached the client claiming to be a server fault. Derive a code from the status
        // instead: any exception thrown with a string body gets an honest one, not just the
        // handful anyone remembers to special-case.
        message = String(body);
        error = statusCodeToErrorCode(statusCode);
      }
    }

    // Server errors are always logged with their stack; client (4xx) errors are not.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        {
          msg: 'Unhandled server error',
          statusCode,
          method: request?.method,
          path: request?.url,
          error: exception instanceof Error ? exception.message : String(exception),
        },
        stack,
      );
      // Forward to GlitchTip/Sentry (no-op when DSN unset). Only 5xx — 4xx are
      // expected client errors, not incidents.
      Sentry.captureException(exception);
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(details !== undefined && { details }),
    });
  }
}
