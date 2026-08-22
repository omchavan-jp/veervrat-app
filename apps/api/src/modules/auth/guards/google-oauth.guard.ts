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
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const pending = typeof request.query.pending === 'string' ? request.query.pending : undefined;
    return pending ? { state: pending } : {};
  }
}
