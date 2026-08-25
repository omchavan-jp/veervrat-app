import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './http-exception.filter';
import { RateLimitedException, ValidationException } from '../exceptions/app.exceptions';

function makeHost() {
  const json = vi.fn();
  const response = { status: vi.fn().mockReturnValue({ json }), json };
  const request = { method: 'POST', url: '/auth/login' };
  return {
    host: {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
    },
    json,
    status: response.status,
  };
}

function run(exception: unknown) {
  const { host, json, status } = makeHost();
  new GlobalExceptionFilter().catch(exception, host as never);
  return { body: json.mock.calls[0][0] as Record<string, unknown>, status };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GlobalExceptionFilter', () => {
  it('reports a throttled request as RATE_LIMITED, not INTERNAL_ERROR', () => {
    // The defect this filter shipped with: `ThrottlerException`'s body is a string, so the
    // object branch never ran and `error` kept its INTERNAL_ERROR default. A 429 claimed to be
    // a server fault, and the user saw an internal error for something entirely expected.
    const { body, status } = run(new ThrottlerException());

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(body.error).toBe('RATE_LIMITED');
    expect(body.error).not.toBe('INTERNAL_ERROR');
  });

  it('derives a code for any string-bodied exception, not just the throttler', () => {
    // The general form of the same bug. Special-casing one exception type would leave the next
    // one someone throws with a string body mislabelled in exactly the same way. A bare
    // `HttpException(string, status)` — which is how ThrottlerException is built — is the shape
    // that reaches this branch.
    expect(run(new HttpException('bad input', HttpStatus.BAD_REQUEST)).body.error).toBe(
      'BAD_REQUEST',
    );
    expect(run(new HttpException('nope', HttpStatus.FORBIDDEN)).body.error).toBe('FORBIDDEN');
  });

  it("passes through Nest's own label for its built-in exceptions", () => {
    // Nest wraps a string argument into an object carrying its own human-readable `error`, so
    // these never reached the broken branch. Recorded because the casing is inconsistent with
    // the SCREAMING_SNAKE codes used everywhere else — a client switching on error codes has to
    // know both. Not changed here: `error` is part of the response contract and renaming it for
    // live endpoints is a separate, deliberate change.
    expect(run(new ForbiddenException('nope')).body.error).toBe('Forbidden');
  });

  it('still reports 5xx with a string body as INTERNAL_ERROR', () => {
    const { body } = run(new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR));
    expect(body.error).toBe('INTERNAL_ERROR');
  });

  it('falls back to HTTP_<status> for a 4xx with no better name', () => {
    const { body } = run(new HttpException('teapot', 418));
    expect(body.error).toBe('HTTP_418');
  });

  it('leaves a structured body alone — domain codes win over derived ones', () => {
    const { body } = run(new ValidationException('bad date', { field: 'dob' }));

    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('bad date');
    expect(body.details).toEqual({ field: 'dob' });
  });

  it('gives RateLimitedException the same shape as a derived rate limit', () => {
    // The client must be able to handle both identically — see the exception's own note.
    const { body } = run(new RateLimitedException(42));

    expect(body.error).toBe('RATE_LIMITED');
    expect(body.details).toEqual({ retryAfterSeconds: 42 });
  });

  it('reports a non-HttpException as an internal error without leaking its message', () => {
    const { body, status } = run(new Error('connection string: postgres://user:pw@host'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(body)).not.toContain('postgres://');
  });

  it('omits details entirely when there are none', () => {
    expect('details' in run(new ForbiddenException('nope')).body).toBe(false);
  });


  it('turns body-parser\'s oversize-request error into a 413, not a 500', () => {
    // Observed on UAT 2026-08-25: every realistic image upload returned
    // {"statusCode":500,"error":"INTERNAL_ERROR","message":"An unexpected error occurred"}.
    // body-parser throws before any controller runs, and throws a plain Error rather than an
    // HttpException, so it fell through to the unhandled-server-error branch. The client could
    // not tell that a smaller file would work.
    const err = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });

    const { body, status } = run(err);

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body.error).toBe('PAYLOAD_TOO_LARGE');
    expect(body.message).not.toBe('An unexpected error occurred');
  });
});
