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
    if (request.query.intent === 'reauth') return { state: REAUTH_STATE };

    return {};
  }
}
