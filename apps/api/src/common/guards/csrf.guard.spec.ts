import { describe, it, expect } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';
import { AccessDeniedException } from '../exceptions/app.exceptions';

const TOKEN = 'abc123token';

function makeContext(method: string, cookies: Record<string, string>, headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, cookies, headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

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
});
