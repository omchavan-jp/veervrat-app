import { describe, it, expect } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard, SKIP_CSRF_KEY } from './csrf.guard';
import { AccessDeniedException } from '../exceptions/app.exceptions';

const TOKEN = 'abc123token';

function makeContext(
  method: string,
  cookies: Record<string, string>,
  headers: Record<string, string>,
  skipCsrf = false,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, cookies, headers }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    // Reflector.getAllAndOverride is called with handler/class; stub it here
    _skipCsrf: skipCsrf,
  } as unknown as ExecutionContext;
}

function makeGuard(skipCsrfForContext = false): CsrfGuard {
  const reflector = {
    getAllAndOverride: () => skipCsrfForContext,
  } as unknown as Reflector;
  return new CsrfGuard(reflector);
}

describe('CsrfGuard', () => {
  const guard = makeGuard();

  it('allows GET requests without CSRF header', () => {
    const ctx = makeContext('GET', {}, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows HEAD requests without CSRF header', () => {
    const ctx = makeContext('HEAD', {}, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows OPTIONS requests without CSRF header', () => {
    const ctx = makeContext('OPTIONS', {}, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows POST with matching CSRF token', () => {
    const ctx = makeContext('POST', { 'csrf-token': TOKEN }, { 'x-csrf-token': TOKEN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows PATCH with matching CSRF token', () => {
    const ctx = makeContext('PATCH', { 'csrf-token': TOKEN }, { 'x-csrf-token': TOKEN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows DELETE with matching CSRF token', () => {
    const ctx = makeContext('DELETE', { 'csrf-token': TOKEN }, { 'x-csrf-token': TOKEN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws on POST with missing CSRF header', () => {
    const ctx = makeContext('POST', { 'csrf-token': TOKEN }, {});
    expect(() => guard.canActivate(ctx)).toThrow(AccessDeniedException);
  });

  it('throws on POST with missing CSRF cookie', () => {
    const ctx = makeContext('POST', {}, { 'x-csrf-token': TOKEN });
    expect(() => guard.canActivate(ctx)).toThrow(AccessDeniedException);
  });

  it('throws on POST with mismatched CSRF token', () => {
    const ctx = makeContext('POST', { 'csrf-token': TOKEN }, { 'x-csrf-token': 'wrongtoken' });
    expect(() => guard.canActivate(ctx)).toThrow(AccessDeniedException);
  });

  it('allows POST when @SkipCsrf() is set on the handler', () => {
    const skipGuard = makeGuard(true);
    // No CSRF cookie or header — would normally throw
    const ctx = makeContext('POST', {}, {});
    expect(skipGuard.canActivate(ctx)).toBe(true);
  });

  it('exports SKIP_CSRF_KEY constant', () => {
    expect(SKIP_CSRF_KEY).toBe('skipCsrf');
  });
});
