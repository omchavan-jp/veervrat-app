import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { GoogleOAuthGuard, REAUTH_STATE, parseReauthState } from './google-oauth.guard';

/**
 * Which settings flow a re-authentication was begun from has to survive the Google round trip, so
 * the person can be returned to it (#208).
 *
 * ⚠️ `state` comes back **from Google**, so it is attacker-influenceable in principle. The
 * allowlist is the whole defence: an unrecognised flow must not reach the settings page. It
 * carries no secret and needs none — what the callback trusts is the session cookie and the Google
 * identity, which this change does not touch.
 */
function contextWithQuery(query: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ query }) as unknown as Request }),
  } as unknown as ExecutionContext;
}

describe('GoogleOAuthGuard — carrying the flow out', () => {
  const guard = new GoogleOAuthGuard();

  it('sends the flow when it is one we published', () => {
    expect(
      guard.getAuthenticateOptions(contextWithQuery({ intent: 'reauth', flow: 'delete' })),
    ).toEqual({ state: 'reauth:delete' });
    expect(
      guard.getAuthenticateOptions(contextWithQuery({ intent: 'reauth', flow: 'email' })),
    ).toEqual({ state: 'reauth:email' });
  });

  it('drops a flow that is not on the allowlist rather than passing it on', () => {
    // Degrades to today's behaviour — proof held, no flow — instead of round-tripping an
    // arbitrary string through Google and back onto the page.
    expect(
      guard.getAuthenticateOptions(contextWithQuery({ intent: 'reauth', flow: 'anything' })),
    ).toEqual({ state: REAUTH_STATE });
  });

  it('still supports re-authentication with no flow at all', () => {
    expect(guard.getAuthenticateOptions(contextWithQuery({ intent: 'reauth' }))).toEqual({
      state: REAUTH_STATE,
    });
  });

  it('leaves signup and sign-in untouched', () => {
    // A pending-signup id still wins, and a plain sign-in still sends no state — the value the
    // callback uses to tell signup from sign-in.
    expect(guard.getAuthenticateOptions(contextWithQuery({ pending: 'abc-123' }))).toEqual({
      state: 'abc-123',
    });
    expect(guard.getAuthenticateOptions(contextWithQuery({}))).toEqual({});
  });
});

describe('parseReauthState — reading the flow back', () => {
  it('reads a published flow', () => {
    expect(parseReauthState('reauth:delete')).toEqual({ isReauth: true, flow: 'delete' });
    expect(parseReauthState('reauth:email')).toEqual({ isReauth: true, flow: 'email' });
  });

  it('refuses a flow that is not on the allowlist, but still treats it as a re-authentication', () => {
    // Both halves matter. Dropping the flow degrades to landing on settings with the proof held.
    // Dropping the whole thing would fall THROUGH to sign-in, which issues a session for whoever
    // signed in — handing over an account to the wrong person.
    expect(parseReauthState('reauth:../../etc')).toEqual({ isReauth: true, flow: undefined });
    expect(parseReauthState('reauth:<script>')).toEqual({ isReauth: true, flow: undefined });
    expect(parseReauthState('reauth:')).toEqual({ isReauth: true, flow: undefined });
  });

  it('does not mistake a pending-signup id for a re-authentication', () => {
    // Pending ids are UUIDs and must keep going down the signup path.
    expect(parseReauthState('9f8b1c2e-4d3a-4b7c-9e1f-2a3b4c5d6e7f')).toEqual({ isReauth: false });
    expect(parseReauthState(undefined)).toEqual({ isReauth: false });
    // A value that merely starts with the word must not qualify either.
    expect(parseReauthState('reauthorised')).toEqual({ isReauth: false });
  });
});
