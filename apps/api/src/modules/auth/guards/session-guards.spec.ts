import { describe, it, expect, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { OptionalSessionGuard } from './optional-session.guard';
import type { AuthService } from '../auth.service';
import type { ConfigService } from '@nestjs/config';

/**
 * These guards put the user on the request, and `@CurrentUser()` hands whatever they put there to
 * every controller. The SHAPE is therefore load-bearing, and nothing else checks it: Passport
 * augments `Request['user']` with an empty interface, so TypeScript accepts any object.
 *
 * That is not hypothetical. `validateSession` changed from returning a user to returning
 * `{ user, sessionId }` (#196). `SessionGuard` was updated; `OptionalSessionGuard` was not, and
 * assigned the wrapper. Every guest-accessible route then saw a user whose `id` was `undefined` —
 * an author could not read their own experience log, and a private image 404'd for the person who
 * had just uploaded it. It typechecked, 1176 tests passed, and CI was green.
 */

const USER = { id: 'user-1', email: 'a@b.c' };
const SESSION_ID = 'session-1';

function makeContext(cookies: Record<string, string>) {
  const request: Record<string, unknown> = { cookies };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    request,
  } as unknown as ExecutionContext & { request: Record<string, unknown> };
}

const config = { get: () => 'veervrat_session' } as unknown as ConfigService;

describe('OptionalSessionGuard', () => {
  it('puts the USER on the request, not the { user, sessionId } wrapper', async () => {
    const auth = {
      validateSession: vi.fn().mockResolvedValue({ user: USER, sessionId: SESSION_ID }),
    } as unknown as AuthService;
    const ctx = makeContext({ veervrat_session: 'tok' });

    await new OptionalSessionGuard(auth, config).canActivate(ctx);

    // The assertion that would have caught the regression: `id` must be reachable.
    expect((ctx.request.user as { id?: string }).id).toBe('user-1');
    expect(ctx.request.user).toEqual(USER);
  });

  it('carries the session id too, so a sensitive action can check re-authentication', async () => {
    const auth = {
      validateSession: vi.fn().mockResolvedValue({ user: USER, sessionId: SESSION_ID }),
    } as unknown as AuthService;
    const ctx = makeContext({ veervrat_session: 'tok' });

    await new OptionalSessionGuard(auth, config).canActivate(ctx);

    expect(ctx.request.sessionId).toBe(SESSION_ID);
  });

  it('allows a guest through with no user attached', async () => {
    const auth = { validateSession: vi.fn() } as unknown as AuthService;
    const ctx = makeContext({});

    await expect(new OptionalSessionGuard(auth, config).canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.user).toBeUndefined();
  });

  it('allows a guest through when the session is invalid, rather than throwing', async () => {
    const auth = { validateSession: vi.fn().mockResolvedValue(null) } as unknown as AuthService;
    const ctx = makeContext({ veervrat_session: 'stale' });

    await expect(new OptionalSessionGuard(auth, config).canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.user).toBeUndefined();
  });
});

describe('SessionGuard', () => {
  it('puts the USER on the request, not the wrapper', async () => {
    const auth = {
      validateSession: vi.fn().mockResolvedValue({ user: USER, sessionId: SESSION_ID }),
    } as unknown as AuthService;
    const ctx = makeContext({ veervrat_session: 'tok' });

    await new SessionGuard(auth, config).canActivate(ctx);

    expect((ctx.request.user as { id?: string }).id).toBe('user-1');
    expect(ctx.request.sessionId).toBe(SESSION_ID);
  });

  it('refuses when there is no session', async () => {
    const auth = { validateSession: vi.fn() } as unknown as AuthService;

    await expect(new SessionGuard(auth, config).canActivate(makeContext({}))).rejects.toThrow();
  });
});
