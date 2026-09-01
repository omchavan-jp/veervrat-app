import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Carries a `state` value through the Google round trip.
 *
 * `state` holds only the id of a server-side pending-signup record — never the date of birth or
 * consent themselves. Those would end up in access logs, browser history and referrer headers,
 * and a date of birth is an identity-verification token. See
 * openspec/changes/age-gate-and-consent/design.md.
 */
export const REAUTH_STATE = 'reauth';

/**
 * Which settings flow a re-authentication was begun from, so the person can be returned to it
 * (#208). Today they land on a settings page that looks untouched, and have to know to reopen the
 * thing they were already in.
 *
 * A fixed allowlist, not free text. `state` comes back from Google and is therefore
 * attacker-influenceable in principle — it must not be able to put an arbitrary value on the
 * settings page. It carries no secret and needs none: what the callback trusts is the session
 * cookie and the Google identity.
 *
 * ⚠️ Only *which flow*. Never what the person typed. An address they are moving to would travel
 * to Google, sit in the redirect URL, and land in access logs and browser history — the same
 * reason the date of birth at signup is carried as a record id rather than a value. The draft
 * stays in the browser.
 */
export const REAUTH_FLOWS = ['delete', 'email'] as const;
export type ReauthFlow = (typeof REAUTH_FLOWS)[number];

/** Reads `reauth` or `reauth:<flow>`, returning the flow only when it is one we published. */
export function parseReauthState(state: string | undefined): {
  isReauth: boolean;
  flow?: ReauthFlow;
} {
  if (!state) return { isReauth: false };
  if (state === REAUTH_STATE) return { isReauth: true };
  const prefix = `${REAUTH_STATE}:`;
  if (!state.startsWith(prefix)) return { isReauth: false };
  const candidate = state.slice(prefix.length);
  const flow = (REAUTH_FLOWS as readonly string[]).includes(candidate)
    ? (candidate as ReauthFlow)
    : undefined;
  // Still a re-authentication even when the flow is unrecognised — dropping the flow degrades to
  // today's behaviour, which is landing on settings with the proof held. Dropping the whole thing
  // would fall through to sign-in, which issues a session for whoever signed in.
  return { isReauth: true, flow };
}

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const pending = typeof request.query.pending === 'string' ? request.query.pending : undefined;
    if (pending) return { state: pending };

    // Re-authentication (#196): proving, mid-session, that the person at the keyboard is still
    // the account holder. `REAUTH_STATE` is a fixed literal rather than an id, so it cannot be
    // confused with a pending-signup id — those are UUIDs. It carries no secret and needs none:
    // what the callback trusts is the session cookie and the Google identity, not this value.
    if (request.query.intent === 'reauth') {
      const flow = typeof request.query.flow === 'string' ? request.query.flow : undefined;
      const known = flow && (REAUTH_FLOWS as readonly string[]).includes(flow);
      return { state: known ? `${REAUTH_STATE}:${flow}` : REAUTH_STATE };
    }

    return {};
  }
}
